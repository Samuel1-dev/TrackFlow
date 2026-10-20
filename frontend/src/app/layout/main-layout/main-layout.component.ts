import { Component, ChangeDetectorRef } from '@angular/core';
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
export class MainLayoutComponent {
  isMobileSidebarOpen = false;

  projects: Project[] = [];
  categories: ExpenseCategory[] = [];

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
    periodType: 'MONTHLY' as const,
    startDate: '',
    endDate: '',
    initialAmount: 100000,
    savingsTarget: 20000,
  };

  constructor(
    public taskSelectionService: TaskSelectionService,
    private tasksService: TasksService,
    private projectsService: ProjectsService,
    private financeService: FinanceService,
    private cdr: ChangeDetectorRef,
  ) {
    this.loadDependencies();
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

  submitCreateBudget() {
    if (!this.newBudget.startDate || !this.newBudget.endDate) return;
    this.financeService
      .createBudget({
        periodType: this.newBudget.periodType,
        startDate: new Date(this.newBudget.startDate).toISOString(),
        endDate: new Date(this.newBudget.endDate).toISOString(),
        initialAmount: this.newBudget.initialAmount,
        savingsTarget: this.newBudget.savingsTarget,
      })
      .subscribe({
        next: (created) => {
          this.taskSelectionService.closeCreateBudget();
          this.taskSelectionService.notifyBudgetCreated(created);
          this.cdr.detectChanges();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors du budget'),
      });
  }
}
