import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus, TaskStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcule le taux de progression d'un projet.
   * Formule :
   *  - Si aucune tâche : 0%
   *  - Si au moins une tâche a un estimatedMinutes > 0 : pondération par le temps estimé
   *  - Sinon : ratio simple (tâches terminées / total)
   */
  private calculateProgress(tasks: { status: TaskStatus; estimatedMinutes: number }[]): number {
    if (!tasks || tasks.length === 0) return 0;

    const totalEstimated = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

    if (totalEstimated > 0) {
      const doneEstimated = tasks
        .filter((t) => t.status === TaskStatus.DONE)
        .reduce((sum, t) => sum + t.estimatedMinutes, 0);
      return Math.round((doneEstimated / totalEstimated) * 100);
    }

    const doneTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;
    return Math.round((doneTasks / tasks.length) * 100);
  }

  private attachStats(project: any) {
    const tasks = project.tasks || [];
    const total = tasks.length;
    const done = tasks.filter((t: any) => t.status === TaskStatus.DONE).length;
    const inProgress = tasks.filter((t: any) => t.status === TaskStatus.IN_PROGRESS).length;
    const blocked = tasks.filter((t: any) => t.status === TaskStatus.BLOCKED).length;
    const now = new Date();
    const overdue = tasks.filter(
      (t: any) => t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE,
    ).length;

    return {
      ...project,
      stats: {
        total,
        done,
        inProgress,
        blocked,
        overdue,
        progressPercent: this.calculateProgress(tasks),
      },
    };
  }

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status ?? ProjectStatus.ACTIVE,
      },
      include: { tasks: true },
    });
    return this.attachStats(project);
  }

  async findAll(userId: string, status?: ProjectStatus) {
    const projects = await this.prisma.project.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        tasks: {
          select: { status: true, estimatedMinutes: true, dueDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return projects.map((p) => this.attachStats(p));
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            estimatedMinutes: true,
            completedAt: true,
          },
          orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        },
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return this.attachStats(project);
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.ensureOwnership(userId, id);
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
        ...(dto.status && { status: dto.status }),
      },
      include: { tasks: { select: { status: true, estimatedMinutes: true, dueDate: true } } },
    });
    return this.attachStats(project);
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);

    // Détacher les tâches associées avant suppression (onDelete: SetNull via Prisma)
    // Prisma gère SetNull automatiquement lors du delete du projet
    await this.prisma.project.delete({ where: { id } });

    return { message: 'Projet supprimé. Les tâches associées ont été détachées du projet.' };
  }

  private async ensureOwnership(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet introuvable');
    if (project.userId !== userId) throw new ForbiddenException('Accès interdit à ce projet');
    return project;
  }
}
