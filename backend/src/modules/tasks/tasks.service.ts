import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { TaskStatus, TaskPriority, Prisma } from '@prisma/client';

// Règles de transition autorisées entre statuts
const ALLOWED_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.DONE, TaskStatus.BLOCKED, TaskStatus.TODO],
  [TaskStatus.BLOCKED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
  [TaskStatus.DONE]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  [TaskPriority.URGENT]: 4,
  [TaskPriority.HIGH]: 3,
  [TaskPriority.NORMAL]: 2,
  [TaskPriority.LOW]: 1,
};

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async ensureOwnership(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');
    if (task.userId !== userId) throw new ForbiddenException('Accès interdit à cette tâche');
    return task;
  }

  private async verifyProjectOwnership(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet introuvable');
    if (project.userId !== userId)
      throw new ForbiddenException('Accès interdit à ce projet');
  }

  private async verifyParentOwnership(userId: string, parentTaskId: string) {
    const parent = await this.prisma.task.findUnique({ where: { id: parentTaskId } });
    if (!parent) throw new NotFoundException('Tâche parente introuvable');
    if (parent.userId !== userId)
      throw new ForbiddenException('Accès interdit à cette tâche parente');
  }

  /**
   * Vérifie que les tâches dont la tâche dépend existent et appartiennent au même utilisateur.
   * Vérifie aussi l'absence de cycles directs (A dépend de B, B dépend de A).
   */
  private async verifyDependencies(userId: string, taskId: string | null, dependencyIds: string[]) {
    for (const depId of dependencyIds) {
      if (taskId && depId === taskId) {
        throw new BadRequestException('Une tâche ne peut pas dépendre d\'elle-même');
      }
      const dep = await this.prisma.task.findUnique({ where: { id: depId } });
      if (!dep) throw new NotFoundException(`Tâche dépendance introuvable : ${depId}`);
      if (dep.userId !== userId)
        throw new ForbiddenException(`Accès interdit à la tâche dépendance : ${depId}`);

      // Vérifie cycle direct : si la dep dépend déjà de taskId
      if (taskId) {
        const reverseDep = await this.prisma.taskDependency.findFirst({
          where: { taskId: depId, dependsOnTaskId: taskId },
        });
        if (reverseDep) {
          throw new BadRequestException(
            `Dépendance circulaire détectée : la tâche "${dep.title}" dépend déjà de la tâche courante`,
          );
        }
      }
    }
  }

  private getFullTaskSelect() {
    return {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      startDate: true,
      dueDate: true,
      completedAt: true,
      estimatedMinutes: true,
      projectId: true,
      parentTaskId: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, title: true, status: true } },
      subTasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          estimatedMinutes: true,
        },
      },
      dependencies: {
        select: {
          dependsOnTask: {
            select: { id: true, title: true, status: true },
          },
        },
      },
      dependentOnMe: {
        select: {
          task: {
            select: { id: true, title: true, status: true },
          },
        },
      },
      timeLogs: {
        select: { id: true, durationMinutes: true, startedAt: true, notes: true },
        orderBy: { startedAt: 'desc' as const },
      },
    };
  }

  private enrichTask(task: any) {
    const totalLoggedMinutes = (task.timeLogs || []).reduce(
      (sum: number, l: any) => sum + l.durationMinutes,
      0,
    );
    const now = new Date();
    const isOverdue =
      task.dueDate && new Date(task.dueDate) < now && task.status !== TaskStatus.DONE;
    const blockedByDeps = (task.dependencies || []).some(
      (d: any) => d.dependsOnTask.status !== TaskStatus.DONE,
    );

    return {
      ...task,
      totalLoggedMinutes,
      isOverdue: !!isOverdue,
      isBlockedByDeps: blockedByDeps,
      timeVarianceMinutes: totalLoggedMinutes - (task.estimatedMinutes || 0),
    };
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateTaskDto) {
    if (dto.projectId) await this.verifyProjectOwnership(userId, dto.projectId);
    if (dto.parentTaskId) await this.verifyParentOwnership(userId, dto.parentTaskId);
    if (dto.dependencyTaskIds?.length) {
      await this.verifyDependencies(userId, null, dto.dependencyTaskIds);
    }

    const task = await this.prisma.task.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        projectId: dto.projectId ?? null,
        parentTaskId: dto.parentTaskId ?? null,
        status: dto.status ?? TaskStatus.TODO,
        priority: dto.priority ?? TaskPriority.NORMAL,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedMinutes: dto.estimatedMinutes ?? 0,
        dependencies: dto.dependencyTaskIds?.length
          ? {
              create: dto.dependencyTaskIds.map((depId) => ({
                dependsOnTaskId: depId,
              })),
            }
          : undefined,
      },
      select: this.getFullTaskSelect(),
    });

    return this.enrichTask(task);
  }

  async findAll(userId: string, filters: FilterTasksDto) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const where: Prisma.TaskWhereInput = {
      userId,
      parentTaskId: null, // Par défaut, seulement les tâches de premier niveau
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.projectId !== undefined && {
        projectId: filters.projectId || null,
      }),
      ...(filters.noProject && { projectId: null }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
      ...(filters.isOverdue && {
        dueDate: { lt: now },
        status: { not: TaskStatus.DONE },
      }),
      ...(filters.isBlocked && { status: TaskStatus.BLOCKED }),
      ...(filters.today && {
        dueDate: { gte: todayStart, lte: todayEnd },
      }),
      ...(filters.dueDateFrom && {
        dueDate: { gte: new Date(filters.dueDateFrom) },
      }),
      ...(filters.dueDateTo && {
        dueDate: { lte: new Date(filters.dueDateTo) },
      }),
    };

    const tasks = await this.prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        startDate: true,
        dueDate: true,
        completedAt: true,
        estimatedMinutes: true,
        projectId: true,
        parentTaskId: true,
        createdAt: true,
        updatedAt: true,
        project: { select: { id: true, title: true } },
        subTasks: { select: { id: true, title: true, status: true } },
        dependencies: {
          select: { dependsOnTask: { select: { id: true, title: true, status: true } } },
        },
        timeLogs: { select: { durationMinutes: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });

    return tasks.map((t) => this.enrichTask(t));
  }

  async findOne(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      select: this.getFullTaskSelect(),
    });
    if (!task) throw new NotFoundException('Tâche introuvable');
    return this.enrichTask(task);
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    await this.ensureOwnership(userId, id);
    if (dto.projectId) await this.verifyProjectOwnership(userId, dto.projectId);
    if (dto.parentTaskId) await this.verifyParentOwnership(userId, dto.parentTaskId);
    if (dto.dependencyTaskIds !== undefined) {
      await this.verifyDependencies(userId, id, dto.dependencyTaskIds);
    }

    const completedAt =
      dto.status === TaskStatus.DONE ? new Date() : undefined;

    // Si on met à jour les dépendances, on les remplace entièrement
    if (dto.dependencyTaskIds !== undefined) {
      await this.prisma.taskDependency.deleteMany({ where: { taskId: id } });
      if (dto.dependencyTaskIds.length > 0) {
        await this.prisma.taskDependency.createMany({
          data: dto.dependencyTaskIds.map((depId) => ({
            taskId: id,
            dependsOnTaskId: depId,
          })),
          skipDuplicates: true,
        });
      }
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.projectId !== undefined && { projectId: dto.projectId || null }),
        ...(dto.parentTaskId !== undefined && { parentTaskId: dto.parentTaskId || null }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.estimatedMinutes !== undefined && { estimatedMinutes: dto.estimatedMinutes }),
        ...(completedAt && { completedAt }),
      },
      select: this.getFullTaskSelect(),
    });

    return this.enrichTask(task);
  }

  async updateStatus(userId: string, id: string, dto: UpdateTaskStatusDto) {
    const task = await this.ensureOwnership(userId, id);

    // Vérifie la transition de statut autorisée
    const allowed = ALLOWED_STATUS_TRANSITIONS[task.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition de statut invalide : "${task.status}" → "${dto.status}". Transitions autorisées : ${allowed.join(', ')}`,
      );
    }

    // Vérifie les dépendances bloquantes si on veut passer à IN_PROGRESS ou DONE
    if (dto.status === TaskStatus.IN_PROGRESS || dto.status === TaskStatus.DONE) {
      const blockingDeps = await this.prisma.taskDependency.findMany({
        where: { taskId: id },
        include: { dependsOnTask: { select: { id: true, title: true, status: true } } },
      });

      const unfinishedDeps = blockingDeps.filter(
        (d) => d.dependsOnTask.status !== TaskStatus.DONE,
      );

      if (unfinishedDeps.length > 0) {
        const names = unfinishedDeps.map((d) => `"${d.dependsOnTask.title}"`).join(', ');
        throw new BadRequestException(
          `Impossible de passer au statut "${dto.status}" : les tâches prérequises suivantes ne sont pas terminées : ${names}`,
        );
      }
    }

    const completedAt = dto.status === TaskStatus.DONE ? new Date() : null;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: dto.status,
        ...(completedAt !== null ? { completedAt } : {}),
        ...(dto.status !== TaskStatus.DONE ? { completedAt: null } : {}),
      },
      select: this.getFullTaskSelect(),
    });

    return this.enrichTask(updated);
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);

    // Vérifie si d'autres tâches dépendent de celle-ci
    const dependents = await this.prisma.taskDependency.findMany({
      where: { dependsOnTaskId: id },
      include: { task: { select: { id: true, title: true } } },
    });

    if (dependents.length > 0) {
      // On supprime les dépendances automatiquement (CASCADE géré par Prisma/DB)
      // Les tâches dépendantes restent mais leur dépendance est supprimée
    }

    await this.prisma.task.delete({ where: { id } });
    return {
      message: 'Tâche supprimée avec succès',
      dependenciesReleased: dependents.length,
    };
  }

  // ─── Statistiques & Productivité ────────────────────────────────────────────

  async getWeeklyStats(userId: string, timezone: string = 'UTC') {
    const now = new Date();
    // Semaine ISO : lundi à dimanche
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // lundi=1 ... dimanche=7
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const [created, completed, overdue, timeLogs] = await Promise.all([
      this.prisma.task.count({
        where: { userId, createdAt: { gte: monday, lte: sunday } },
      }),
      this.prisma.task.count({
        where: {
          userId,
          status: TaskStatus.DONE,
          completedAt: { gte: monday, lte: sunday },
        },
      }),
      this.prisma.task.count({
        where: {
          userId,
          dueDate: { lt: now, gte: monday },
          status: { not: TaskStatus.DONE },
        },
      }),
      this.prisma.timeLog.findMany({
        where: { userId, startedAt: { gte: monday, lte: sunday } },
        select: { durationMinutes: true, task: { select: { estimatedMinutes: true } } },
      }),
    ]);

    const totalLoggedMinutes = timeLogs.reduce((sum, l) => sum + l.durationMinutes, 0);
    const totalEstimatedMinutes = timeLogs.reduce(
      (sum, l) => sum + (l.task.estimatedMinutes || 0),
      0,
    );

    const weekTotal = await this.prisma.task.count({
      where: { userId, createdAt: { gte: monday, lte: sunday } },
    });

    return {
      weekStart: monday.toISOString(),
      weekEnd: sunday.toISOString(),
      tasksCreated: created,
      tasksCompleted: completed,
      tasksOverdue: overdue,
      completionRate: weekTotal > 0 ? Math.round((completed / weekTotal) * 100) : 0,
      totalEstimatedMinutes,
      totalLoggedMinutes,
      timeVarianceMinutes: totalLoggedMinutes - totalEstimatedMinutes,
    };
  }
}
