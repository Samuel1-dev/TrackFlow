import { Module } from '@nestjs/common';
import { BudgetsService } from './budgets/budgets.service';
import { BudgetsController } from './budgets/budgets.controller';
import { ExpensesService } from './expenses/expenses.service';
import { ExpensesController } from './expenses/expenses.controller';

@Module({
  controllers: [BudgetsController, ExpensesController],
  providers: [BudgetsService, ExpensesService],
  exports: [BudgetsService, ExpensesService],
})
export class FinanceModule {}
