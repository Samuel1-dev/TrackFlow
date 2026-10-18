import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { FilterExpensesDto } from './dto/filter-expenses.dto';
import { Prisma } from '@prisma/client';
import { FinanceCalculator } from '../finance-calculator';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  private async ensureOwnership(userId: string, expenseId: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new NotFoundException('Dépense introuvable');
    if (expense.userId !== userId) throw new ForbiddenException('Accès interdit à cette dépense');
    return expense;
  }

  private async verifyCategoryOwnership(userId: string, categoryId: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        id: categoryId,
        OR: [{ userId }, { userId: null }], // catégories système (userId=null) ou de l'utilisateur
      },
    });
    if (!category) throw new NotFoundException('Catégorie introuvable ou non accessible');
    return category;
  }

  async create(userId: string, dto: CreateExpenseDto) {
    await this.verifyCategoryOwnership(userId, dto.categoryId);

    const expense = await this.prisma.expense.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        date: new Date(dto.date),
        description: dto.description,
      },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    });

    return {
      ...expense,
      amount: FinanceCalculator.toNumber(expense.amount),
    };
  }

  async findAll(userId: string, filters: FilterExpensesDto) {
    const where: Prisma.ExpenseWhereInput = {
      userId,
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.from && { date: { gte: new Date(filters.from) } }),
      ...(filters.to && { date: { lte: new Date(filters.to) } }),
      ...(filters.from && filters.to && {
        date: { gte: new Date(filters.from), lte: new Date(filters.to) },
      }),
      ...(filters.search && {
        description: { contains: filters.search, mode: 'insensitive' },
      }),
    };

    const [expenses, aggregate] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { category: { select: { id: true, name: true, icon: true, color: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      expenses: expenses.map((e) => ({
        ...e,
        amount: FinanceCalculator.toNumber(e.amount),
      })),
      totalSpent: Math.round(FinanceCalculator.toNumber(aggregate._sum.amount ?? 0)),
      count: expenses.length,
    };
  }

  async findOne(userId: string, id: string) {
    await this.ensureOwnership(userId, id);
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    });
    return {
      ...expense,
      amount: FinanceCalculator.toNumber(expense!.amount),
    };
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    await this.ensureOwnership(userId, id);
    if (dto.categoryId) await this.verifyCategoryOwnership(userId, dto.categoryId);

    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    });

    return {
      ...expense,
      amount: FinanceCalculator.toNumber(expense.amount),
    };
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);
    await this.prisma.expense.delete({ where: { id } });
    return { message: 'Dépense supprimée avec succès' };
  }

  async getCategories(userId: string) {
    return this.prisma.expenseCategory.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
      orderBy: { name: 'asc' },
    });
  }
}
