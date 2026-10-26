import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus, TaskPriority, BudgetPeriodType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  const userId = 'user-uuid-1';

  beforeEach(async () => {
    const mockPrisma = {
      task: {
        findMany: jest.fn(),
      },
      budget: {
        findMany: jest.fn(),
      },
      expense: {
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty list when no overdue tasks or budget overages', async () => {
    prisma.task.findMany
      .mockResolvedValueOnce([]) // overdue tasks
      .mockResolvedValueOnce([]); // blocked tasks
    prisma.budget.findMany.mockResolvedValueOnce([]);

    const res = await service.getNotifications(userId);
    expect(res.total).toBe(0);
    expect(res.notifications).toEqual([]);
    expect(res.counts.critical).toBe(0);
    expect(res.counts.overdueTasks).toBe(0);
  });

  it('should detect overdue tasks and mark critical if 2+ days late', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    prisma.task.findMany
      .mockResolvedValueOnce([
        {
          id: 'task-1',
          title: 'Rapport financier',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDate: threeDaysAgo,
          project: { id: 'p1', title: 'Compta' },
        },
      ])
      .mockResolvedValueOnce([]); // blocked tasks
    prisma.budget.findMany.mockResolvedValueOnce([]);

    const res = await service.getNotifications(userId);
    expect(res.total).toBe(1);
    expect(res.counts.overdueTasks).toBe(1);
    expect(res.notifications[0].type).toBe('TASK_OVERDUE');
    expect(res.notifications[0].severity).toBe('CRITICAL');
    expect(res.notifications[0].title).toContain('Rapport financier');
    expect(res.notifications[0].message).toContain('retard');
  });

  it('should detect budget exceedance and create critical alert', async () => {
    const now = new Date();
    prisma.task.findMany
      .mockResolvedValueOnce([]) // overdue tasks
      .mockResolvedValueOnce([]); // blocked tasks

    prisma.budget.findMany.mockResolvedValueOnce([
      {
        id: 'budget-1',
        periodType: BudgetPeriodType.MONTHLY,
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        initialAmount: 100000,
        savingsTarget: 20000,
        currency: 'XOF',
      },
    ]);

    prisma.expense.aggregate.mockResolvedValueOnce({
      _sum: { amount: 125000 }, // 125000 > 100000
    });

    const res = await service.getNotifications(userId);
    expect(res.total).toBe(1);
    expect(res.counts.budgetAlerts).toBe(1);
    expect(res.notifications[0].type).toBe('BUDGET_EXCEEDED');
    expect(res.notifications[0].severity).toBe('CRITICAL');
    expect(res.notifications[0].message).toContain('25');
  });
});
