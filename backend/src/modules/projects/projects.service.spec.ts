import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectStatus, TaskStatus } from '@prisma/client';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: any;

  const userId = 'user-uuid-1';
  const projectId = 'project-uuid-1';

  const mockTasks = [
    { status: TaskStatus.DONE, estimatedMinutes: 60, dueDate: null },
    { status: TaskStatus.IN_PROGRESS, estimatedMinutes: 120, dueDate: null },
    { status: TaskStatus.TODO, estimatedMinutes: 0, dueDate: null },
  ];

  const mockProject = {
    id: projectId,
    userId,
    title: 'Test Project',
    description: 'Description',
    startDate: new Date('2026-01-01'),
    endDate: null,
    status: ProjectStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: mockTasks,
  };

  beforeEach(async () => {
    const mockPrisma = {
      project: {
        create: jest.fn().mockResolvedValue(mockProject),
        findMany: jest.fn().mockResolvedValue([mockProject]),
        findFirst: jest.fn().mockResolvedValue(mockProject),
        findUnique: jest.fn().mockResolvedValue(mockProject),
        update: jest.fn().mockResolvedValue(mockProject),
        delete: jest.fn().mockResolvedValue(mockProject),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateProgress', () => {
    it('should return 0 when no tasks', () => {
      const service_any = service as any;
      expect(service_any.calculateProgress([])).toBe(0);
    });

    it('should compute weighted progress based on estimatedMinutes', () => {
      const service_any = service as any;
      // 60 done / (60+120) total = 33%
      const result = service_any.calculateProgress(mockTasks);
      expect(result).toBe(33);
    });

    it('should compute simple ratio when estimatedMinutes all 0', () => {
      const service_any = service as any;
      const tasks = [
        { status: TaskStatus.DONE, estimatedMinutes: 0 },
        { status: TaskStatus.TODO, estimatedMinutes: 0 },
        { status: TaskStatus.TODO, estimatedMinutes: 0 },
      ];
      // 1/3 = 33%
      expect(service_any.calculateProgress(tasks)).toBe(33);
    });
  });

  describe('create', () => {
    it('should create a project and attach stats', async () => {
      const result = await service.create(userId, {
        title: 'Test Project',
        startDate: '2026-01-01',
      });
      expect(result).toHaveProperty('stats');
      expect(result.stats.total).toBe(3);
      expect(result.stats.done).toBe(1);
    });
  });

  describe('findAll', () => {
    it('should return list of projects with stats', async () => {
      const result = await service.findAll(userId);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('stats');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if project not found', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      await expect(service.findOne(userId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return project with tasks and stats', async () => {
      const result = await service.findOne(userId, projectId);
      expect(result.id).toBe(projectId);
      expect(result.stats.progressPercent).toBeDefined();
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if user does not own project', async () => {
      prisma.project.findUnique.mockResolvedValue({ ...mockProject, userId: 'other-user' });
      await expect(
        service.update(userId, projectId, { title: 'New Title' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete project and return message', async () => {
      const result = await service.remove(userId, projectId);
      expect(result.message).toContain('supprimé');
    });
  });
});
