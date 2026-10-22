import { Component, OnInit, OnDestroy, ChangeDetectorRef, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { TaskSelectionService } from '../../core/services/task-selection.service';
import { TasksService } from '../../core/services/tasks.service';
import { ProjectsService } from '../../core/services/projects.service';
import { FinanceService } from '../../core/services/finance.service';
import { Project } from '../../core/models/project.models';
import { ExpenseCategory } from '../../core/models/finance.models';

@Component({
  selector: 'app-main-layout',
  standalone: false,
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  isMobileSidebarOpen = false;

  projects: Project[] = [];
  categories: ExpenseCategory[] = [];
  private subs: Subscription = new Subscription();

  newTask = {
    title: '',
    description: '',
    projectId: undefined as string | undefined,
    priority: 'NORMAL' as any,
    dueDate: '',
    estimatedMinutes: 60,
  };

  newExpense = {
    categoryId: '',
    amount: 1000,
    description: '',
  };

  newBudget = {
    periodType: 'MONTHLY' as 'MONTHLY' | 'WEEKLY',
    startDate: '',
    endDate: '',
    initialAmount: 100000,
    savingsTarget: 20000,
  };

  budgetErrorMessage: string = '';
  budgetConflictDetected: boolean = false;
  isSubmittingBudget: boolean = false;

  constructor(
    public taskSelectionService: TaskSelectionService,
    private tasksService: TasksService,
    private projectsService: ProjectsService,
    private financeService: FinanceService,
    private cdr: ChangeDetectorRef,
  ) {
    this.initDefaultBudgetDates();

    effect(() => {
      if (this.taskSelectionService.isBudgetModalOpen()) {
        this.initDefaultBudgetDates();
      }
    });
  }

  initDefaultBudgetDates() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    this.newBudget.startDate = formatYMD(firstDay);
    this.newBudget.endDate = formatYMD(lastDay);
    this.budgetErrorMessage = '';
    this.budgetConflictDetected = false;
    this.isSubmittingBudget = false;
  }

  ngOnInit() {
    this.loadDependencies();

    // Écoute de la création et suppression de projet en temps réel
    this.subs.add(
      this.taskSelectionService.projectCreated$.subscribe((newProj) => {
        this.projects.unshift(newProj);
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.projectDeleted$.subscribe((deletedId) => {
        this.projects = this.projects.filter((p) => p.id !== deletedId);
        if (this.newTask.projectId === deletedId) {
          this.newTask.projectId = undefined;
        }
        this.cdr.detectChanges();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  loadDependencies() {
    this.projectsService.findAll().subscribe((res) => {
      this.projects = res;
      this.cdr.detectChanges();
    });
    this.financeService.getCategories().subscribe((res) => {
      this.categories = res;
      if (res.length > 0 && !this.newExpense.categoryId) {
        this.newExpense.categoryId = res[0].id;
      }
      this.cdr.detectChanges();
    });
  }

  submitCreateTask() {
    if (!this.newTask.title) return;
    this.tasksService
      .create({
        title: this.newTask.title,
        description: this.newTask.description,
        projectId: this.newTask.projectId,
        priority: this.newTask.priority,
        dueDate: this.newTask.dueDate ? new Date(this.newTask.dueDate).toISOString() : undefined,
        estimatedMinutes: this.newTask.estimatedMinutes,
      })
      .subscribe({
        next: (created) => {
          this.taskSelectionService.closeCreateTask();
          this.taskSelectionService.notifyTaskCreated(created);
          this.taskSelectionService.selectTask(created);
          this.newTask.title = '';
          this.newTask.description = '';
          this.cdr.detectChanges();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors de la création'),
      });
  }

  submitCreateExpense() {
    if (!this.newExpense.categoryId || !this.newExpense.amount) return;
    this.financeService
      .createExpense({
        categoryId: this.newExpense.categoryId,
        amount: this.newExpense.amount,
        date: new Date().toISOString(),
        description: this.newExpense.description,
      })
      .subscribe({
        next: (created) => {
          this.taskSelectionService.closeCreateExpense();
          this.taskSelectionService.notifyExpenseCreated(created);
          this.newExpense.description = '';
          this.cdr.detectChanges();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors de la dépense'),
      });
  }

  submitCreateBudget(replaceExisting = false) {
    this.budgetErrorMessage = '';
    if (!this.newBudget.startDate || !this.newBudget.endDate) {
      this.budgetErrorMessage = 'Veuillez sélectionner les dates de début et de fin.';
      this.cdr.detectChanges();
      return;
    }

    if (this.newBudget.savingsTarget > this.newBudget.initialAmount) {
      this.budgetErrorMessage = 'L\'objectif d\'épargne ne peut pas dépasser le montant initial.';
      this.cdr.detectChanges();
      return;
    }

    this.isSubmittingBudget = true;
    this.cdr.detectChanges();

    this.financeService
      .createBudget({
        periodType: this.newBudget.periodType,
        startDate: new Date(this.newBudget.startDate + 'T00:00:00.000Z').toISOString(),
        endDate: new Date(this.newBudget.endDate + 'T23:59:59.999Z').toISOString(),
        initialAmount: this.newBudget.initialAmount,
        savingsTarget: this.newBudget.savingsTarget,
        replaceExisting,
      })
      .subscribe({
        next: (created) => {
          this.isSubmittingBudget = false;
          this.budgetConflictDetected = false;
          this.budgetErrorMessage = '';
          this.taskSelectionService.closeCreateBudget();
          this.taskSelectionService.notifyBudgetCreated(created);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmittingBudget = false;
          if (err.status === 409) {
            this.budgetConflictDetected = true;
            this.budgetErrorMessage = err.error?.message || 'Un budget existe déjà pour cette période.';
          } else {
            this.budgetErrorMessage = err.error?.message || 'Erreur lors de la création du budget.';
          }
          this.cdr.detectChanges();
        },
      });
  }
}
