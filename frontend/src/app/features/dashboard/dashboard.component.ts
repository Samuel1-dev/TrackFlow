import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { TaskSelectionService } from '../../core/services/task-selection.service';
import { TasksService } from '../../core/services/tasks.service';
import { FinanceService } from '../../core/services/finance.service';
import { DashboardSummary, Expense } from '../../core/models/finance.models';
import { Task } from '../../core/models/task.models';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  summary: DashboardSummary | null = null;
  allTasks: Task[] = [];
  recentExpenses: Expense[] = [];
  private subs: Subscription = new Subscription();

  constructor(
    private dashboardService: DashboardService,
    public authService: AuthService,
    public taskSelectionService: TaskSelectionService,
    private tasksService: TasksService,
    private financeService: FinanceService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadData();

    // Écoute en temps réel de tous les événements métier
    this.subs.add(
      this.taskSelectionService.taskCreated$.subscribe((newTask) => {
        this.allTasks.unshift(newTask);
        this.loadData();
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.taskUpdated$.subscribe((updatedTask) => {
        const index = this.allTasks.findIndex((t) => t.id === updatedTask.id);
        if (index !== -1) {
          this.allTasks[index] = updatedTask;
        }
        this.loadData();
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.taskDeleted$.subscribe((deletedId) => {
        this.allTasks = this.allTasks.filter((t) => t.id !== deletedId);
        this.loadData();
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.expenseCreated$.subscribe((newExpense) => {
        this.recentExpenses.unshift(newExpense);
        this.loadData();
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.budgetCreated$.subscribe(() => {
        this.loadData();
        this.cdr.detectChanges();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  loadData() {
    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.cdr.detectChanges();
      },
    });

    this.tasksService.findAll().subscribe({
      next: (tasks) => {
        this.allTasks = tasks;
        this.cdr.detectChanges();
      },
    });

    this.financeService.getExpenses().subscribe({
      next: (res) => {
        this.recentExpenses = res.expenses;
        this.cdr.detectChanges();
      },
    });
  }

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  get inProgressTasksCount(): number {
    return this.allTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  }

  toggleTaskDone(task: Task) {
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    this.tasksService.updateStatus(task.id, nextStatus as any).subscribe({
      next: (updated) => {
        this.taskSelectionService.notifyTaskUpdated(updated);
        this.loadData();
        this.cdr.detectChanges();
      },
      error: (err) => alert(err.error?.message || 'Erreur lors de la mise à jour'),
    });
  }
}
