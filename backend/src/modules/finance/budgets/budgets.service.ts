import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetPeriodType } from '@prisma/client';
import { FinanceCalculator } from '../finance-calculator';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async ensureOwnership(userId: string, budgetId: string) {
    const budget = await this.prisma.budget.findUnique({ where: { id: budgetId } });
    if (!budget) throw new NotFoundException('Budget introuvable');
    if (budget.userId !== userId) throw new ForbiddenException('Accès interdit à ce budget');
    return budget;
  }

  /**
   * Calcule le total des dépenses pour une période donnée.
   */
  private async computeTotalSpent(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
    return FinanceCalculator.toNumber(result._sum.amount ?? 0);
  }

  /**
   * Vérifie qu'aucun budget existant ne chevauche la période demandée pour le même type.
   */
  private async checkNoPeriodOverlap(
    userId: string,
    periodType: BudgetPeriodType,
    startDate: Date,
    endDate: Date,
    excludeBudgetId?: string,
  ) {
    const overlapping = await this.prisma.budget.findFirst({
      where: {
        userId,
        periodType,
        id: excludeBudgetId ? { not: excludeBudgetId } : undefined,
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException(
        `Un budget ${periodType} existe déjà pour cette période (${overlapping.startDate.toISOString().split('T')[0]} → ${overlapping.endDate.toISOString().split('T')[0]}). Veuillez clôturer l'ancien budget ou choisir une autre période.`,
      );
    }
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateBudgetDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début');
    }

    if (dto.savingsTarget > dto.initialAmount) {
      throw new BadRequestException(
        'L\'objectif d\'épargne ne peut pas dépasser le montant initial du budget',
      );
    }

    // Gestion du remplacement automatique ou de la vérification de chevauchement
    const overlapping = await this.prisma.budget.findFirst({
      where: {
        userId,
        periodType: dto.periodType,
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });

    if (overlapping) {
      if (dto.replaceExisting) {
        await this.prisma.budget.delete({ where: { id: overlapping.id } });
      } else {
        throw new ConflictException(
          `Un budget ${dto.periodType} existe déjà pour cette période (${overlapping.startDate.toISOString().split('T')[0]} → ${overlapping.endDate.toISOString().split('T')[0]}).`,
        );
      }
    }

    const budget = await this.prisma.budget.create({
      data: {
        userId,
        periodType: dto.periodType,
        startDate,
        endDate,
        initialAmount: dto.initialAmount,
        savingsTarget: dto.savingsTarget,
        currency: dto.currency ?? 'XOF',
      },
    });

    const totalSpent = await this.computeTotalSpent(userId, startDate, endDate);
    const indicators = FinanceCalculator.buildBudgetIndicators({
      initialAmount: budget.initialAmount,
      savingsTarget: budget.savingsTarget,
      totalSpent,
      currency: budget.currency,
    });

    return { ...budget, ...indicators };
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    const existing = await this.ensureOwnership(userId, id);

    const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début');
    }

    const initialAmount = dto.initialAmount !== undefined ? dto.initialAmount : FinanceCalculator.toNumber(existing.initialAmount);
    const savingsTarget = dto.savingsTarget !== undefined ? dto.savingsTarget : FinanceCalculator.toNumber(existing.savingsTarget);

    if (savingsTarget > initialAmount) {
      throw new BadRequestException(
        'L\'objectif d\'épargne ne peut pas dépasser le montant initial du budget',
      );
    }

    const periodType = dto.periodType ?? existing.periodType;
    await this.checkNoPeriodOverlap(userId, periodType, startDate, endDate, id);

    const updated = await this.prisma.budget.update({
      where: { id },
      data: {
        periodType,
        startDate,
        endDate,
        initialAmount,
        savingsTarget,
        currency: dto.currency ?? existing.currency,
      },
    });

    const totalSpent = await this.computeTotalSpent(userId, startDate, endDate);
    const indicators = FinanceCalculator.buildBudgetIndicators({
      initialAmount: updated.initialAmount,
      savingsTarget: updated.savingsTarget,
      totalSpent,
      currency: updated.currency,
    });

    return { ...updated, ...indicators };
  }

  async getActiveBudget(userId: string) {
    const now = new Date();

    const budget = await this.prisma.budget.findFirst({
      where: {
        userId,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: 'desc' },
    });

    if (!budget) {
      return {
        activeBudget: null,
        message: 'Aucun budget actif pour la période en cours. Créez un budget pour commencer le suivi.',
      };
    }

    const totalSpent = await this.computeTotalSpent(userId, budget.startDate, budget.endDate);

    // Répartition par catégorie
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        date: { gte: budget.startDate, lte: budget.endDate },
      },
      include: { category: { select: { id: true, name: true } } },
    });

    const expensesForBreakdown = expenses.map((e) => ({
      categoryId: e.category.id,
      categoryName: e.category.name,
      amount: e.amount,
    }));

    const indicators = FinanceCalculator.buildBudgetIndicators({
      initialAmount: budget.initialAmount,
      savingsTarget: budget.savingsTarget,
      totalSpent,
      currency: budget.currency,
    });

    const breakdown = FinanceCalculator.buildExpensesBreakdown(expensesForBreakdown, totalSpent);

    return {
      activeBudget: {
        id: budget.id,
        periodType: budget.periodType,
        startDate: budget.startDate,
        endDate: budget.endDate,
        createdAt: budget.createdAt,
        ...indicators,
      },
      expensesBreakdown: breakdown,
    };
  }

  async getHistory(userId: string, page = 1, limit = 10) {
    const now = new Date();
    const skip = (page - 1) * limit;

    const [budgets, total] = await Promise.all([
      this.prisma.budget.findMany({
        where: { userId, endDate: { lt: now } },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.budget.count({ where: { userId, endDate: { lt: now } } }),
    ]);

    const enriched = await Promise.all(
      budgets.map(async (b) => {
        const totalSpent = await this.computeTotalSpent(userId, b.startDate, b.endDate);
        const indicators = FinanceCalculator.buildBudgetIndicators({
          initialAmount: b.initialAmount,
          savingsTarget: b.savingsTarget,
          totalSpent,
          currency: b.currency,
        });
        return { ...b, ...indicators };
      }),
    );

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(userId: string, id: string) {
    const budget = await this.ensureOwnership(userId, id);

    const totalSpent = await this.computeTotalSpent(userId, budget.startDate, budget.endDate);
    const indicators = FinanceCalculator.buildBudgetIndicators({
      initialAmount: budget.initialAmount,
      savingsTarget: budget.savingsTarget,
      totalSpent,
      currency: budget.currency,
    });

    return { ...budget, ...indicators };
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);
    await this.prisma.budget.delete({ where: { id } });
    return { message: 'Budget supprimé avec succès' };
  }
}
