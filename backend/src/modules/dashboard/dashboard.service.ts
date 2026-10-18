import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus } from '@prisma/client';
import { BudgetsService } from '../finance/budgets/budgets.service';
import { TasksService } from '../tasks/tasks.service';
import { ProjectsService } from '../projects/projects.service';
import { FinanceCalculator } from '../finance/finance-calculator';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private budgetsService: BudgetsService,
    private tasksService: TasksService,
    private projectsService: ProjectsService,
  ) {}

  async getSummary(userId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // ─── Productivité ────────────────────────────────────────────────────────

    const [tasksDueToday, urgentTasks, overdueTasks, blockedTasks, weeklyStats] =
      await Promise.all([
        this.prisma.task.findMany({
          where: {
            userId,
            dueDate: { gte: todayStart, lte: todayEnd },
            status: { not: TaskStatus.DONE },
          },
          select: { id: true, title: true, status: true, priority: true, dueDate: true },
          take: 10,
        }),
        this.prisma.task.findMany({
          where: {
            userId,
            priority: 'URGENT',
            status: { not: TaskStatus.DONE },
          },
          select: { id: true, title: true, status: true, dueDate: true },
          take: 10,
        }),
        this.prisma.task.findMany({
          where: {
            userId,
            dueDate: { lt: now },
            status: { not: TaskStatus.DONE },
          },
          select: { id: true, title: true, status: true, priority: true, dueDate: true },
          orderBy: { dueDate: 'asc' },
          take: 10,
        }),
        this.prisma.task.findMany({
          where: {
            userId,
            status: TaskStatus.BLOCKED,
          },
          select: { id: true, title: true, status: true, priority: true },
          take: 10,
        }),
        this.tasksService.getWeeklyStats(userId),
      ]);

    // Projets actifs avec taux d'avancement
    const activeProjects = await this.projectsService.findAll(userId, 'ACTIVE' as any);

    // ─── Finances ─────────────────────────────────────────────────────────────

    const { activeBudget, expensesBreakdown } =
      await this.budgetsService.getActiveBudget(userId).then((r: any) => ({
        activeBudget: r.activeBudget ?? null,
        expensesBreakdown: r.expensesBreakdown ?? [],
      }));

    return {
      productivity: {
        tasksDueToday,
        tasksDueTodayCount: tasksDueToday.length,
        urgentTasks,
        urgentTasksCount: urgentTasks.length,
        overdueTasks,
        overdueTasksCount: overdueTasks.length,
        blockedTasks,
        blockedTasksCount: blockedTasks.length,
        activeProjects: activeProjects.map((p: any) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          progressPercent: p.stats?.progressPercent ?? 0,
          stats: p.stats,
        })),
        weeklyStats,
      },
      finance: {
        activeBudget,
        expensesBreakdown,
      },
    };
  }
}
