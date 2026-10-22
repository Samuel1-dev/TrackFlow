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

  isEditModalOpen = false;
  editForm = {
    initialAmount: 0,
    savingsTarget: 0,
  };
  isSubmittingEdit = false;
  editErrorMessage = '';

  constructor(
    private financeService: FinanceService,
    public taskSelectionService: TaskSelectionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadData();

    // Recharger le budget en temps réel dès qu'un budget est créé, mis à jour, supprimé ou une dépense effectuée
    this.subs.add(
      this.taskSelectionService.budgetCreated$.subscribe(() => {
        this.loadData();
      }),
    );
    this.subs.add(
      this.taskSelectionService.budgetUpdated$.subscribe(() => {
        this.loadData();
      }),
    );
    this.subs.add(
      this.taskSelectionService.budgetDeleted$.subscribe(() => {
        this.loadData();
      }),
    );
    this.subs.add(
      this.taskSelectionService.expenseCreated$.subscribe(() => {
        this.loadData();
      }),
    );
    this.subs.add(
      this.taskSelectionService.expenseDeleted$.subscribe(() => {
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
        this.activeBudget = res?.activeBudget ?? null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.activeBudget = null;
        this.cdr.detectChanges();
      },
    });

    this.financeService.getBudgetHistory().subscribe({
      next: (res) => {
        this.history = res.data || [];
        this.cdr.detectChanges();
      },
    });
  }

  openEditBudget() {
    if (!this.activeBudget) return;
    this.editForm = {
      initialAmount: Number(this.activeBudget.initialAmount),
      savingsTarget: Number(this.activeBudget.savingsTarget),
    };
    this.editErrorMessage = '';
    this.isEditModalOpen = true;
    this.cdr.detectChanges();
  }

  closeEditBudget() {
    this.isEditModalOpen = false;
    this.editErrorMessage = '';
    this.cdr.detectChanges();
  }

  submitUpdateBudget() {
    if (!this.activeBudget) return;
    if (this.editForm.savingsTarget > this.editForm.initialAmount) {
      this.editErrorMessage = 'L\'objectif d\'épargne ne peut pas dépasser le montant initial.';
      this.cdr.detectChanges();
      return;
    }

    this.isSubmittingEdit = true;
    this.cdr.detectChanges();

    this.financeService
      .updateBudget(this.activeBudget.id, {
        initialAmount: this.editForm.initialAmount,
        savingsTarget: this.editForm.savingsTarget,
      })
      .subscribe({
        next: (updated) => {
          this.isSubmittingEdit = false;
          this.isEditModalOpen = false;
          this.taskSelectionService.notifyBudgetUpdated(updated);
          this.loadData();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmittingEdit = false;
          this.editErrorMessage = err.error?.message || 'Erreur lors de la mise à jour du budget.';
          this.cdr.detectChanges();
        },
      });
  }

  deleteActiveBudget() {
    if (!this.activeBudget) return;
    const confirmed = confirm(
      'Voulez-vous vraiment supprimer ce budget actif ? Vous pourrez en créer un nouveau immédiatement.',
    );
    if (!confirmed) return;

    const id = this.activeBudget.id;
    this.financeService.deleteBudget(id).subscribe({
      next: () => {
        this.activeBudget = null;
        this.taskSelectionService.notifyBudgetDeleted(id);
        this.loadData();
        this.cdr.detectChanges();
      },
      error: (err) => alert(err.error?.message || 'Erreur lors de la suppression'),
    });
  }
}
