import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TaskStatus, TaskPriority } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: any;

  const userId = 'user-uuid-1';
  const taskId = 'task-uuid-1';

  const baseTask = {
    id: taskId,
    userId,
    title: 'Test Task',
    description: null,
    status: TaskStatus.TODO,
    priority: TaskPriority.NORMAL,
    startDate: null,
    dueDate: null,
    completedAt: null,
    estimatedMinutes: 60,
    projectId: null,
    parentTaskId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: null,
    subTasks: [],
    dependencies: [],
    dependentOnMe: [],
    timeLogs: [],
  };

  beforeEach(async () => {
    const mockPrisma = {
      task: {
        findUnique: jest.fn().mockResolvedValue(baseTask),
        findFirst: jest.fn().mockResolvedValue(baseTask),
        findMany: jest.fn().mockResolvedValue([baseTask]),
        create: jest.fn().mockResolvedValue(baseTask),
        update: jest.fn().mockResolvedValue(baseTask),
        delete: jest.fn().mockResolvedValue(baseTask),
        count: jest.fn().mockResolvedValue(0),
      },
      project: {
        findUnique: jest.fn().mockResolvedValue({ id: 'proj-1', userId }),
      },
      taskDependency: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      timeLog: {
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { durationMinutes: 0 } }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a task successfully', async () => {
      const result = await service.create(userId, {
        title: 'Test Task',
        estimatedMinutes: 60,
      });
      expect(result).toHaveProperty('title', 'Test Task');
      expect(result).toHaveProperty('isOverdue');
      expect(result).toHaveProperty('totalLoggedMinutes');
    });

    it('should reject dependency on task belonging to another user', async () => {
      // Mock a dependency task belonging to a different user
      prisma.task.findUnique.mockResolvedValueOnce({ ...baseTask, userId: 'other-user' });
      await expect(
        service.create(userId, {
          title: 'A',
          dependencyTaskIds: ['some-other-task-id'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if task not found', async () => {
      prisma.task.findFirst.mockResolvedValue(null);
      await expect(service.findOne(userId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return enriched task', async () => {
      const result = await service.findOne(userId, taskId);
      expect(result.id).toBe(taskId);
      expect(result).toHaveProperty('isBlockedByDeps');
      expect(result).toHaveProperty('timeVarianceMinutes');
    });
  });

  describe('updateStatus', () => {
    it('should reject invalid status transition TODO -> DONE', async () => {
      await expect(
        service.updateStatus(userId, taskId, { status: TaskStatus.DONE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid transition TODO -> IN_PROGRESS', async () => {
      prisma.task.update.mockResolvedValue({
        ...baseTask,
        status: TaskStatus.IN_PROGRESS,
      });
      const result = await service.updateStatus(userId, taskId, {
        status: TaskStatus.IN_PROGRESS,
      });
      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should block transition to IN_PROGRESS if dependency not DONE', async () => {
      // baseTask.status = TODO -> IN_PROGRESS is valid transition
      // but there is an unfinished dependency
      prisma.taskDependency.findMany.mockResolvedValue([
        {
          dependsOnTask: {
            id: 'dep-1',
            title: 'Required Task',
            status: TaskStatus.TODO, // not done
          },
        },
      ]);

      await expect(
        service.updateStatus(userId, taskId, { status: TaskStatus.IN_PROGRESS }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow transition to IN_PROGRESS if all dependencies are DONE', async () => {
      prisma.taskDependency.findMany.mockResolvedValue([
        {
          dependsOnTask: {
            id: 'dep-1',
            title: 'Required Task',
            status: TaskStatus.DONE,
          },
        },
      ]);
      prisma.task.update.mockResolvedValue({
        ...baseTask,
        status: TaskStatus.IN_PROGRESS,
      });

      const result = await service.updateStatus(userId, taskId, {
        status: TaskStatus.IN_PROGRESS,
      });
      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException if user does not own the task', async () => {
      prisma.task.findUnique.mockResolvedValue({ ...baseTask, userId: 'other' });
      await expect(service.remove(userId, taskId)).rejects.toThrow(ForbiddenException);
    });

    it('should delete task and report released dependencies', async () => {
      prisma.taskDependency.findMany.mockResolvedValue([{ task: { id: 'dep-task-1', title: 'Dependent' } }]);
      const result = await service.remove(userId, taskId);
      expect(result.message).toContain('supprimée');
      expect(result.dependenciesReleased).toBe(1);
    });
  });
});
