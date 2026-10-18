import { FinanceCalculator } from './finance-calculator';
import { Decimal } from '@prisma/client/runtime/library';

describe('FinanceCalculator', () => {
  describe('buildBudgetIndicators', () => {
    it('should compute all indicators correctly - example from spec', () => {
      // Exemple du cahier des charges :
      // Budget initial : 50 000, Objectif épargne : 10 000, Total dépensé : 35 000
      const result = FinanceCalculator.buildBudgetIndicators({
        initialAmount: 50000,
        savingsTarget: 10000,
        totalSpent: 35000,
        currency: 'XOF',
      });

      expect(result.initialAmount).toBe(50000);
      expect(result.savingsTarget).toBe(10000);
      expect(result.availableBudgetForExpenses).toBe(40000); // 50000 - 10000
      expect(result.totalSpent).toBe(35000);
      expect(result.remainingBudget).toBe(15000); // 50000 - 35000
      expect(result.estimatedSavings).toBe(15000); // 50000 - 35000
      expect(result.savingsTargetGap).toBe(5000); // 15000 - 10000 (positif = bon)
      expect(result.isOverBudget).toBe(false);
      expect(result.isOverExpenseBudget).toBe(false);
    });

    it('should detect budget overspend', () => {
      const result = FinanceCalculator.buildBudgetIndicators({
        initialAmount: 50000,
        savingsTarget: 10000,
        totalSpent: 55000,
        currency: 'XOF',
      });

      expect(result.isOverBudget).toBe(true);
      expect(result.isOverExpenseBudget).toBe(true);
      expect(result.remainingBudget).toBe(-5000);
      expect(result.estimatedSavings).toBe(-5000);
      expect(result.savingsTargetGap).toBe(-15000); // négatif = n'a pas atteint l'objectif
    });

    it('should detect expense budget overspend even without global overspend', () => {
      // Dépensé 45000 > budget prévu pour dépenses (40000) mais < budget total (50000)
      const result = FinanceCalculator.buildBudgetIndicators({
        initialAmount: 50000,
        savingsTarget: 10000,
        totalSpent: 45000,
        currency: 'XOF',
      });

      expect(result.isOverBudget).toBe(false); // 45000 < 50000
      expect(result.isOverExpenseBudget).toBe(true); // 45000 > 40000
      expect(result.savingsTargetGap).toBe(-5000); // épargne estimée (5000) - objectif (10000)
    });

    it('should handle zero expenses', () => {
      const result = FinanceCalculator.buildBudgetIndicators({
        initialAmount: 50000,
        savingsTarget: 10000,
        totalSpent: 0,
        currency: 'XOF',
      });

      expect(result.totalSpent).toBe(0);
      expect(result.remainingBudget).toBe(50000);
      expect(result.estimatedSavings).toBe(50000);
      expect(result.savingsTargetGap).toBe(40000); // très positif
      expect(result.savingsProgressPercent).toBe(100);
    });

    it('should handle savings target greater than budget (edge case)', () => {
      // objectif épargne > budget initial : situation anormale mais gérée
      const result = FinanceCalculator.buildBudgetIndicators({
        initialAmount: 5000,
        savingsTarget: 10000,
        totalSpent: 0,
        currency: 'XOF',
      });

      expect(result.availableBudgetForExpenses).toBe(-5000); // négatif, signale l'incohérence
      expect(result.savingsTargetGap).toBe(-5000); // n'atteint pas l'objectif
    });

    it('should accept Decimal type from Prisma', () => {
      const result = FinanceCalculator.buildBudgetIndicators({
        initialAmount: new Decimal('50000.00'),
        savingsTarget: new Decimal('10000.00'),
        totalSpent: 35000,
        currency: 'XOF',
      });

      expect(result.initialAmount).toBe(50000);
      expect(result.savingsTarget).toBe(10000);
      expect(result.remainingBudget).toBe(15000);
    });
  });

  describe('buildExpensesBreakdown', () => {
    const expenses = [
      { categoryId: 'cat-1', categoryName: 'Alimentation', amount: 20000 },
      { categoryId: 'cat-1', categoryName: 'Alimentation', amount: 5000 },
      { categoryId: 'cat-2', categoryName: 'Transport', amount: 10000 },
    ];

    it('should group expenses by category and compute percentages', () => {
      const totalSpent = 35000;
      const breakdown = FinanceCalculator.buildExpensesBreakdown(expenses, totalSpent);

      expect(breakdown).toHaveLength(2);

      const alim = breakdown.find((b) => b.categoryId === 'cat-1');
      expect(alim?.total).toBe(25000);
      expect(alim?.percentage).toBe(71); // 25000/35000 = 71.4%

      const transport = breakdown.find((b) => b.categoryId === 'cat-2');
      expect(transport?.total).toBe(10000);
      expect(transport?.percentage).toBe(29);
    });

    it('should handle zero total spent without division by zero', () => {
      const breakdown = FinanceCalculator.buildExpensesBreakdown(expenses, 0);
      breakdown.forEach((b) => expect(b.percentage).toBe(0));
    });
  });

  describe('availableBudgetForExpenses', () => {
    it('should subtract savings target from initial amount', () => {
      expect(FinanceCalculator.availableBudgetForExpenses(50000, 10000)).toBe(40000);
    });
  });

  describe('savingsTargetGap', () => {
    it('should return positive when savings exceed target', () => {
      expect(FinanceCalculator.savingsTargetGap(15000, 10000)).toBe(5000);
    });
    it('should return negative when savings below target', () => {
      expect(FinanceCalculator.savingsTargetGap(5000, 10000)).toBe(-5000);
    });
    it('should return zero when exactly on target', () => {
      expect(FinanceCalculator.savingsTargetGap(10000, 10000)).toBe(0);
    });
  });
});
