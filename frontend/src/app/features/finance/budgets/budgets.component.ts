import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { FinanceService } from '../../../core/services/finance.service';
import { TaskSelectionService } from '../../../core/services/task-selection.service';
import { ActiveBudget } from '../../../core/models/finance.models';

@Component({
  selector: 'app-budgets',
  standalone: false,
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.scss',
})
export class BudgetsComponent implements OnInit, OnDestroy {
  activeBudget: ActiveBudget | null = null;
  history: any[] = [];
  private subs: Subscription = new Subscription();

  constructor(
    private financeService: FinanceService,
    public taskSelectionService: TaskSelectionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadData();

    // Recharger le budget en temps réel dès qu'un budget est créé ou une dépense effectuée
    this.subs.add(
      this.taskSelectionService.budgetCreated$.subscribe(() => {
        this.loadData();
      }),
    );
    this.subs.add(
      this.taskSelectionService.expenseCreated$.subscribe(() => {
        this.loadData();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  loadData() {
    this.financeService.getActiveBudget().subscribe({
      next: (res) => {
        if (res && res.activeBudget) {
          this.activeBudget = res.activeBudget;
          this.cdr.detectChanges();
        }
      },
    });

    this.financeService.getBudgetHistory().subscribe({
      next: (res) => {
        this.history = res.data || [];
        this.cdr.detectChanges();
      },
    });
  }
}
