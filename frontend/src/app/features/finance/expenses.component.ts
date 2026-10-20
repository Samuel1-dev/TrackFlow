import { Component, OnInit } from '@angular/core';
import { FinanceService } from '../../core/services/finance.service';
import { TaskSelectionService } from '../../core/services/task-selection.service';
import { Expense, ExpenseCategory } from '../../core/models/finance.models';

@Component({
  selector: 'app-expenses',
  standalone: false,
  template: `
    <div class="space-y-6 pb-12">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-900 dark:text-white">Dépenses</h1>
          <p class="text-xs text-slate-400 mt-1">Consultez l'historique et la ventilation de vos sorties d'argent</p>
        </div>
        <button
          (click)="taskSelectionService.openCreateExpense()"
          class="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <app-icon name="plus" [size]="15"></app-icon>
          <span>Ajouter une dépense</span>
        </button>
      </div>

      <!-- Categories Filter Pills -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          (click)="filterByCategory('')"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
          [class.bg-brand-600]="selectedCategory === ''"
          [class.text-white]="selectedCategory === ''"
          [class.bg-white]="selectedCategory !== ''"
          [class.dark:bg-surface-cardDark]="selectedCategory !== ''"
          [class.text-slate-600]="selectedCategory !== ''"
          [class.dark:text-slate-300]="selectedCategory !== ''"
        >
          Toutes
        </button>
        @for (cat of categories; track cat.id) {
          <button
            (click)="filterByCategory(cat.id)"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
            [class.bg-brand-600]="selectedCategory === cat.id"
            [class.text-white]="selectedCategory === cat.id"
            [class.bg-white]="selectedCategory !== cat.id"
            [class.dark:bg-surface-cardDark]="selectedCategory !== cat.id"
            [class.text-slate-600]="selectedCategory !== cat.id"
            [class.dark:text-slate-300]="selectedCategory !== cat.id"
          >
            {{ cat.name }}
          </button>
        }
      </div>

      <!-- Total Spent Banner -->
      <div class="p-5 rounded-3xl bg-white dark:bg-surface-cardDark border border-slate-100 dark:border-slate-800 shadow-card flex items-center justify-between">
        <div>
          <span class="text-xs text-slate-400 font-semibold uppercase">Total dépenses affichées</span>
          <h2 class="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
            {{ totalSpent | fcfa }}
          </h2>
        </div>
        <span class="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {{ expenses.length }} transactions
        </span>
      </div>

      <!-- Expenses List Card -->
      <div class="rounded-3xl bg-white dark:bg-surface-cardDark border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden">
        @if (expenses.length === 0) {
          <div class="py-16 text-center">
            <div class="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <app-icon name="expenses" [size]="24"></app-icon>
            </div>
            <p class="text-sm font-bold text-slate-800 dark:text-slate-200">Aucune dépense trouvée</p>
            <p class="text-xs text-slate-400 mt-1">Ajoutez votre première dépense pour alimenter le suivi.</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (expense of expenses; track expense.id) {
              <div class="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <div class="flex items-center gap-3.5">
                  <div class="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                    <app-icon name="expenses" [size]="18"></app-icon>
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                      {{ expense.description || expense.category.name }}
                    </h3>
                    <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span class="font-medium text-slate-600 dark:text-slate-300">{{ expense.category.name }}</span>
                      <span>&bull;</span>
                      <span>{{ expense.date | date:'dd MMM yyyy, HH:mm' }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <span class="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                    -{{ expense.amount | fcfa }}
                  </span>
                  <button
                    (click)="deleteExpense(expense.id)"
                    class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Supprimer"
                  >
                    <app-icon name="trash" [size]="16"></app-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ExpensesComponent implements OnInit {
  expenses: Expense[] = [];
  categories: ExpenseCategory[] = [];
  totalSpent = 0;
  selectedCategory = '';

  constructor(
    private financeService: FinanceService,
    public taskSelectionService: TaskSelectionService,
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadExpenses();
  }

  loadCategories() {
    this.financeService.getCategories().subscribe({
      next: (cats) => (this.categories = cats),
    });
  }

  loadExpenses() {
    this.financeService
      .getExpenses({ categoryId: this.selectedCategory || undefined })
      .subscribe({
        next: (res) => {
          this.expenses = res.expenses;
          this.totalSpent = res.totalSpent;
        },
      });
  }

  filterByCategory(catId: string) {
    this.selectedCategory = catId;
    this.loadExpenses();
  }

  deleteExpense(id: string) {
    if (confirm('Supprimer cette dépense ?')) {
      this.financeService.deleteExpense(id).subscribe({
        next: () => this.loadExpenses(),
      });
    }
  }
}
