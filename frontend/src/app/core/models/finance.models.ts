export type BudgetPeriodType = 'WEEKLY' | 'MONTHLY';

export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  userId?: string | null;
}

export interface Expense {
  id: string;
  userId: string;
  categoryId: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description?: string | null;
  createdAt: string;
}

export interface BudgetIndicators {
  initialAmount: number;
  savingsTarget: number;
  availableBudgetForExpenses: number;
  totalSpent: number;
  remainingBudget: number;
  estimatedSavings: number;
  savingsTargetGap: number;
  savingsProgressPercent: number;
  isOverBudget: boolean;
  isOverExpenseBudget: boolean;
  currency: string;
}

export interface ExpenseBreakdownItem {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
}

export interface ActiveBudget {
  id: string;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  createdAt: string;
  initialAmount: number;
  savingsTarget: number;
  availableBudgetForExpenses: number;
  totalSpent: number;
  remainingBudget: number;
  estimatedSavings: number;
  savingsTargetGap: number;
  savingsProgressPercent: number;
  isOverBudget: boolean;
  isOverExpenseBudget: boolean;
  currency: string;
}

export interface ActiveBudgetResponse {
  activeBudget: ActiveBudget | null;
  expensesBreakdown: ExpenseBreakdownItem[];
  message?: string;
}

export interface DashboardSummary {
  productivity: {
    tasksDueToday: any[];
    tasksDueTodayCount: number;
    urgentTasks: any[];
    urgentTasksCount: number;
    overdueTasks: any[];
    overdueTasksCount: number;
    blockedTasks: any[];
    blockedTasksCount: number;
    activeProjects: Array<{
      id: string;
      title: string;
      status: string;
      progressPercent: number;
      stats: any;
    }>;
    weeklyStats: any;
  };
  finance: {
    activeBudget: ActiveBudget | null;
    expensesBreakdown: ExpenseBreakdownItem[];
  };
}
