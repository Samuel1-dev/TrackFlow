import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: any;

  const userId = 'user-uuid-1';

  beforeEach(async () => {
    const mockPrisma = {
      task: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'task-1',
            title: 'Design UI layout',
            description: 'Make it clean',
            status: 'TODO',
            priority: 'HIGH',
            createdAt: new Date('2026-10-01'),
            updatedAt: new Date('2026-10-01'),
            project: { id: 'p1', title: 'TaskFlow Web' },
          },
          {
            id: 'task-2',
            title: 'Devise new architecture',
            description: null,
            status: 'IN_PROGRESS',
            priority: 'NORMAL',
            createdAt: new Date('2026-10-02'),
            updatedAt: new Date('2026-10-02'),
            project: null,
          },
        ]),
      },
      project: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'proj-1',
            title: 'Design System',
            description: 'Component library',
            status: 'ACTIVE',
            createdAt: new Date('2026-10-01'),
            updatedAt: new Date('2026-10-01'),
          },
        ]),
      },
      expense: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'exp-1',
            description: 'Domain purchase',
            amount: 15000,
            date: new Date('2026-10-03'),
            createdAt: new Date('2026-10-03'),
            updatedAt: new Date('2026-10-03'),
            category: { id: 'cat-1', name: 'Software', color: '#6366f1', icon: 'tag' },
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty results if query is blank', async () => {
    const res = await service.search(userId, { q: '   ' });
    expect(res.total).toBe(0);
    expect(res.results.length).toBe(0);
    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });

  it('should prioritize items starting with the query letters', async () => {
    const res = await service.search(userId, { q: 'des', page: 1, limit: 10 });
    expect(res.total).toBe(4); // 2 tasks + 1 proj + 1 exp
    // Items starting with "des" must come first
    expect(res.results[0].title.toLowerCase().startsWith('des')).toBe(true);
    expect(res.counts.tasks).toBe(2);
    expect(res.counts.projects).toBe(1);
    expect(res.counts.expenses).toBe(1);
  });

  it('should paginate results properly', async () => {
    const res = await service.search(userId, { q: 'des', page: 1, limit: 2 });
    expect(res.results.length).toBe(2);
    expect(res.total).toBe(4);
    expect(res.totalPages).toBe(2);
  });
});
