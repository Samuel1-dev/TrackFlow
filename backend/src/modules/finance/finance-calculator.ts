import { Decimal } from '@prisma/client/runtime/library';

/**
 * Moteur de calcul financier — source de vérité pour tous les indicateurs budgétaires.
 * Toutes les entrées Decimal sont converties en number pour les calculs.
 * Les montants FCFA n'ayant pas de centimes en usage courant, on arrondit à l'entier.
 */
export class FinanceCalculator {
  /**
   * Convertit un Decimal Prisma ou un number en nombre JS sûr.
   */
  static toNumber(value: Decimal | number | string): number {
    if (value instanceof Decimal) return value.toNumber();
    return Number(value);
  }

  /**
   * Budget disponible pour les dépenses planifiées.
   * = initialAmount − savingsTarget
   */
  static availableBudgetForExpenses(initialAmount: number, savingsTarget: number): number {
    return Math.round(initialAmount - savingsTarget);
  }

  /**
   * Budget restant réel = initialAmount − totalSpent
   */
  static remainingBudget(initialAmount: number, totalSpent: number): number {
    return Math.round(initialAmount - totalSpent);
  }

  /**
   * Épargne estimée = initialAmount − totalSpent
   * (identique à remainingBudget ; le terme « estimée » souligne que c'est déclaratif)
   */
  static estimatedSavings(initialAmount: number, totalSpent: number): number {
    return Math.round(initialAmount - totalSpent);
  }

  /**
   * Écart par rapport à l'objectif d'épargne.
   * > 0 : l'utilisateur économise plus que prévu.
   * < 0 : l'utilisateur économise moins que prévu (dépassement de l'objectif).
   */
  static savingsTargetGap(estimatedSavings: number, savingsTarget: number): number {
    return Math.round(estimatedSavings - savingsTarget);
  }

  /**
   * Construit l'objet complet d'indicateurs budgétaires à partir des valeurs brutes.
   */
  static buildBudgetIndicators(params: {
    initialAmount: Decimal | number;
    savingsTarget: Decimal | number;
    totalSpent: number;
    currency: string;
  }) {
    const initialAmount = FinanceCalculator.toNumber(params.initialAmount);
    const savingsTarget = FinanceCalculator.toNumber(params.savingsTarget);
    const { totalSpent, currency } = params;

    const availableBudgetForExpenses = FinanceCalculator.availableBudgetForExpenses(
      initialAmount,
      savingsTarget,
    );
    const remainingBudget = FinanceCalculator.remainingBudget(initialAmount, totalSpent);
    const estimatedSavings = FinanceCalculator.estimatedSavings(initialAmount, totalSpent);
    const savingsTargetGap = FinanceCalculator.savingsTargetGap(estimatedSavings, savingsTarget);

    const savingsProgressPercent =
      savingsTarget > 0
        ? Math.min(100, Math.round((estimatedSavings / savingsTarget) * 100))
        : 100;

    return {
      initialAmount,
      savingsTarget,
      availableBudgetForExpenses,
      totalSpent,
      remainingBudget,
      estimatedSavings,
      savingsTargetGap,
      savingsProgressPercent,
      isOverBudget: totalSpent > initialAmount,
      isOverExpenseBudget: totalSpent > availableBudgetForExpenses,
      currency,
    };
  }

  /**
   * Répartition des dépenses par catégorie avec montant et pourcentage.
   */
  static buildExpensesBreakdown(
    expenses: { categoryId: string; categoryName: string; amount: Decimal | number }[],
    totalSpent: number,
  ) {
    const grouped: Record<string, { categoryId: string; categoryName: string; total: number }> = {};

    for (const e of expenses) {
      if (!grouped[e.categoryId]) {
        grouped[e.categoryId] = {
          categoryId: e.categoryId,
          categoryName: e.categoryName,
          total: 0,
        };
      }
      grouped[e.categoryId].total += FinanceCalculator.toNumber(e.amount);
    }

    return Object.values(grouped).map((g) => ({
      ...g,
      total: Math.round(g.total),
      percentage: totalSpent > 0 ? Math.round((g.total / totalSpent) * 100) : 0,
    }));
  }
}
