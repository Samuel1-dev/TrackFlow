import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchQueryDto, SearchScopeType } from './dto/search-query.dto';

export interface SearchResultItem {
  id: string;
  type: 'task' | 'project' | 'expense';
  title: string;
  subtitle?: string | null;
  status?: string | null;
  priority?: string | null;
  amount?: number | null;
  date?: string | null;
  categoryName?: string | null;
  projectName?: string | null;
  data: any;
}

export interface SearchResponse {
  query: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  counts: {
    all: number;
    tasks: number;
    projects: number;
    expenses: number;
  };
  results: SearchResultItem[];
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string, dto: SearchQueryDto): Promise<SearchResponse> {
    const rawQuery = (dto.q || '').trim();
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 6;
    const scope: SearchScopeType = dto.type || 'all';

    if (!rawQuery) {
      return {
        query: '',
        page: 1,
        limit,
        total: 0,
        totalPages: 1,
        counts: { all: 0, tasks: 0, projects: 0, expenses: 0 },
        results: [],
      };
    }

    const qLower = rawQuery.toLowerCase();

    // 1. Fetch matching tasks
    const shouldFetchTasks = scope === 'all' || scope === 'tasks';
    const tasksPromise = shouldFetchTasks
      ? this.prisma.task.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: rawQuery, mode: 'insensitive' } },
              { description: { contains: rawQuery, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            estimatedMinutes: true,
            createdAt: true,
            updatedAt: true,
            project: { select: { id: true, title: true } },
          },
        })
      : Promise.resolve([]);

    // 2. Fetch matching projects
    const shouldFetchProjects = scope === 'all' || scope === 'projects';
    const projectsPromise = shouldFetchProjects
      ? this.prisma.project.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: rawQuery, mode: 'insensitive' } },
              { description: { contains: rawQuery, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]);

    // 3. Fetch matching expenses
    const shouldFetchExpenses = scope === 'all' || scope === 'expenses';
    const expensesPromise = shouldFetchExpenses
      ? this.prisma.expense.findMany({
          where: {
            userId,
            OR: [
              { description: { contains: rawQuery, mode: 'insensitive' } },
              { category: { name: { contains: rawQuery, mode: 'insensitive' } } },
            ],
          },
          select: {
            id: true,
            amount: true,
            date: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            category: { select: { id: true, name: true, color: true, icon: true } },
          },
        })
      : Promise.resolve([]);

    const [tasks, projects, expenses] = await Promise.all([
      tasksPromise,
      projectsPromise,
      expensesPromise,
    ]);

    // Map tasks to SearchResultItem with relevance score
    const scoredTasks = tasks.map((t) => {
      const titleLower = (t.title || '').toLowerCase();
      let score = 3;
      if (titleLower.startsWith(qLower)) {
        score = 0; // Highest priority: starts with typed letters
      } else if (titleLower.split(/\s+/).some((w) => w.startsWith(qLower))) {
        score = 1; // Word in title starts with typed letters
      } else if (titleLower.includes(qLower)) {
        score = 2; // Title contains query
      }

      const item: SearchResultItem = {
        id: t.id,
        type: 'task',
        title: t.title,
        subtitle: t.description || (t.project ? `Projet: ${t.project.title}` : null),
        status: t.status,
        priority: t.priority,
        projectName: t.project?.title || null,
        data: t,
      };

      return { item, score, date: t.updatedAt || t.createdAt };
    });

    // Map projects to SearchResultItem with relevance score
    const scoredProjects = projects.map((p) => {
      const titleLower = (p.title || '').toLowerCase();
      let score = 3;
      if (titleLower.startsWith(qLower)) {
        score = 0;
      } else if (titleLower.split(/\s+/).some((w) => w.startsWith(qLower))) {
        score = 1;
      } else if (titleLower.includes(qLower)) {
        score = 2;
      }

      const item: SearchResultItem = {
        id: p.id,
        type: 'project',
        title: p.title,
        subtitle: p.description || `Statut: ${p.status}`,
        status: p.status,
        data: p,
      };

      return { item, score, date: p.updatedAt || p.createdAt };
    });

    // Map expenses to SearchResultItem with relevance score
    const scoredExpenses = expenses.map((e) => {
      const desc = e.description || `Dépense ${e.category?.name || ''}`;
      const descLower = desc.toLowerCase();
      const catLower = (e.category?.name || '').toLowerCase();

      let score = 3;
      if (descLower.startsWith(qLower) || catLower.startsWith(qLower)) {
        score = 0;
      } else if (
        descLower.split(/\s+/).some((w) => w.startsWith(qLower)) ||
        catLower.split(/\s+/).some((w) => w.startsWith(qLower))
      ) {
        score = 1;
      } else if (descLower.includes(qLower) || catLower.includes(qLower)) {
        score = 2;
      }

      const item: SearchResultItem = {
        id: e.id,
        type: 'expense',
        title: e.description || e.category?.name || 'Dépense',
        subtitle: e.category?.name ? `Catégorie: ${e.category.name}` : null,
        amount: Number(e.amount),
        date: e.date.toISOString(),
        categoryName: e.category?.name || null,
        data: e,
      };

      return { item, score, date: e.updatedAt || e.createdAt };
    });

    // Combine and sort by relevance score asc, then recency desc
    const combined = [...scoredTasks, ...scoredProjects, ...scoredExpenses].sort(
      (a, b) => {
        if (a.score !== b.score) {
          return a.score - b.score;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      },
    );

    const total = combined.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const safePage = Math.max(1, Math.min(page, totalPages));
    const offset = (safePage - 1) * limit;
    const paginatedItems = combined.slice(offset, offset + limit).map((c) => c.item);

    return {
      query: rawQuery,
      page: safePage,
      limit,
      total,
      totalPages,
      counts: {
        all: scoredTasks.length + scoredProjects.length + scoredExpenses.length,
        tasks: scoredTasks.length,
        projects: scoredProjects.length,
        expenses: scoredExpenses.length,
      },
      results: paginatedItems,
    };
  }
}
