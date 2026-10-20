import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { FinanceService } from '../../../core/services/finance.service';
import { TaskSelectionService } from '../../../core/services/task-selection.service';
import { Expense, ExpenseCategory } from '../../../core/models/finance.models';

@Component({
  selector: 'app-expenses',
  standalone: false,
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
})
export class ExpensesComponent implements OnInit, OnDestroy {
  expenses: Expense[] = [];
  categories: ExpenseCategory[] = [];
  totalSpent = 0;
  selectedCategory = '';
  private subs: Subscription = new Subscription();

  constructor(
    private financeService: FinanceService,
    public taskSelectionService: TaskSelectionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadExpenses();

    // Ajout instantané sans rechargement de page
    this.subs.add(
      this.taskSelectionService.expenseCreated$.subscribe((newExp) => {
        if (!this.selectedCategory || this.selectedCategory === newExp.categoryId) {
          this.expenses.unshift(newExp);
        }
        this.totalSpent += Number(newExp.amount);
        this.cdr.detectChanges();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  loadCategories() {
    this.financeService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.cdr.detectChanges();
      },
    });
  }

  loadExpenses() {
    this.financeService
      .getExpenses({ categoryId: this.selectedCategory || undefined })
      .subscribe({
        next: (res) => {
          this.expenses = res.expenses;
          this.totalSpent = res.totalSpent;
          this.cdr.detectChanges();
        },
      });
  }

  filterByCategory(catId: string) {
    this.selectedCategory = catId;
    this.loadExpenses();
  }

  deleteExpense(id: string) {
    if (confirm('Supprimer cette dépense ?')) {
      const target = this.expenses.find((e) => e.id === id);
      this.financeService.deleteExpense(id).subscribe({
        next: () => {
          this.expenses = this.expenses.filter((e) => e.id !== id);
          if (target) {
            this.totalSpent -= Number(target.amount);
          }
          this.taskSelectionService.notifyExpenseDeleted(id);
          this.cdr.detectChanges();
        },
      });
    }
  }
}
