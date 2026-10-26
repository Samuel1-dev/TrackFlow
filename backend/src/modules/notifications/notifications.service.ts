import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus } from '@prisma/client';
import {
  NotificationItemDto,
  NotificationResponseDto,
  NotificationSeverity,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: string): Promise<NotificationResponseDto> {
    const now = new Date();
    const notifications: NotificationItemDto[] = [];

    // 1. Tâches sous délais non terminées à temps (Overdue Tasks)
    const overdueTasks = await this.prisma.task.findMany({
      where: {
        userId,
        status: { not: TaskStatus.DONE },
        dueDate: { lt: now },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        project: { select: { id: true, title: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    for (const task of overdueTasks) {
      const dueTime = new Date(task.dueDate!).getTime();
      const diffMs = now.getTime() - dueTime;
      const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const isCritical = daysOverdue >= 2 || task.priority === 'URGENT';

      const formattedDueDate = new Date(task.dueDate!).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      notifications.push({
        id: `task-overdue-${task.id}`,
        type: 'TASK_OVERDUE',
        severity: isCritical ? 'CRITICAL' : 'WARNING',
        title: `Tâche en retard : ${task.title}`,
        message: `Cette tâche devait être achevée le ${formattedDueDate} (${daysOverdue} jour${daysOverdue > 1 ? 's' : ''} de retard). Statut : ${task.status}.`,
        createdAt: task.dueDate!.toISOString(),
        actionUrl: '/tasks',
        actionLabel: 'Voir la tâche',
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          dueDate: task.dueDate,
          daysOverdue,
          priority: task.priority,
          status: task.status,
          projectName: task.project?.title || null,
        },
      });
    }

    // 2. Tâches bloquées
    const blockedTasks = await this.prisma.task.findMany({
      where: {
        userId,
        status: TaskStatus.BLOCKED,
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        project: { select: { id: true, title: true } },
      },
    });

    for (const task of blockedTasks) {
      notifications.push({
        id: `task-blocked-${task.id}`,
        type: 'TASK_BLOCKED',
        severity: 'INFO',
        title: `Tâche bloquée : ${task.title}`,
        message: `Cette tâche est bloquée et requiert la finalisation de ses dépendances prérequises.`,
        createdAt: task.updatedAt.toISOString(),
        actionUrl: '/tasks',
        actionLabel: 'Consulter la tâche',
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          projectName: task.project?.title || null,
        },
      });
    }

    // 3. Budgets actifs et vérification des dépassements de dépenses
    const activeBudgets = await this.prisma.budget.findMany({
      where: {
        userId,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: {
        id: true,
        periodType: true,
        startDate: true,
        endDate: true,
        initialAmount: true,
        savingsTarget: true,
        currency: true,
      },
    });

    for (const budget of activeBudgets) {
      const expensesAgg = await this.prisma.expense.aggregate({
        where: {
          userId,
          date: { gte: budget.startDate, lte: budget.endDate },
        },
        _sum: { amount: true },
      });

      const spent = Number(expensesAgg._sum.amount || 0);
      const initial = Number(budget.initialAmount);

      const periodLabel = budget.periodType === 'MONTHLY' ? 'mensuel' : 'hebdomadaire';

      if (spent > initial) {
        const excess = spent - initial;
        notifications.push({
          id: `budget-exceeded-${budget.id}`,
          type: 'BUDGET_EXCEEDED',
          severity: 'CRITICAL',
          title: `Dépassement de budget ${periodLabel}`,
          message: `Vos dépenses actuelles (${spent.toLocaleString('fr-FR')} ${budget.currency}) dépassent le plafond alloué de ${initial.toLocaleString('fr-FR')} ${budget.currency} d'un montant de ${excess.toLocaleString('fr-FR')} ${budget.currency}.`,
          createdAt: budget.startDate.toISOString(),
          actionUrl: '/finance/budgets',
          actionLabel: 'Ajuster le budget',
          metadata: {
            budgetId: budget.id,
            periodType: budget.periodType,
            spent,
            initialAmount: initial,
            excess,
            currency: budget.currency,
          },
        });
      } else if (initial > 0 && spent >= initial * 0.9) {
        const percentage = Math.round((spent / initial) * 100);
        notifications.push({
          id: `budget-warning-${budget.id}`,
          type: 'BUDGET_WARNING',
          severity: 'WARNING',
          title: `Budget ${periodLabel} presque épuisé (${percentage}%)`,
          message: `Attention : vous avez déjà consommé ${percentage}% de votre budget alloué (${spent.toLocaleString('fr-FR')} / ${initial.toLocaleString('fr-FR')} ${budget.currency}).`,
          createdAt: budget.startDate.toISOString(),
          actionUrl: '/finance/budgets',
          actionLabel: 'Voir le budget',
          metadata: {
            budgetId: budget.id,
            periodType: budget.periodType,
            spent,
            initialAmount: initial,
            percentage,
            currency: budget.currency,
          },
        });
      }
    }

    // Tri par sévérité puis par date de création décroissante
    const severityOrder: Record<NotificationSeverity, number> = {
      CRITICAL: 0,
      WARNING: 1,
      INFO: 2,
    };

    notifications.sort((a, b) => {
      const orderDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const criticalCount = notifications.filter((n) => n.severity === 'CRITICAL').length;
    const warningCount = notifications.filter((n) => n.severity === 'WARNING').length;
    const infoCount = notifications.filter((n) => n.severity === 'INFO').length;
    const overdueCount = notifications.filter((n) => n.type === 'TASK_OVERDUE').length;
    const budgetAlertsCount = notifications.filter(
      (n) => n.type === 'BUDGET_EXCEEDED' || n.type === 'BUDGET_WARNING',
    ).length;

    return {
      total: notifications.length,
      counts: {
        critical: criticalCount,
        warning: warningCount,
        info: infoCount,
        overdueTasks: overdueCount,
        budgetAlerts: budgetAlertsCount,
      },
      notifications,
    };
  }
}
