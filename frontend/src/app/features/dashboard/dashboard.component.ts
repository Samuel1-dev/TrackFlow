import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { TaskSelectionService } from '../../core/services/task-selection.service';
import { TasksService } from '../../core/services/tasks.service';
import { FinanceService } from '../../core/services/finance.service';
import { DashboardSummary, Expense } from '../../core/models/finance.models';
import { Task } from '../../core/models/task.models';

export interface WeeklyExpensePoint {
  weekIndex: number;
  label: string;
  rangeLabel: string;
  amount: number;
  x: number;
  y: number;
}

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

  weeklyExpensePoints: WeeklyExpensePoint[] = [];
  curvePath: string = '';
  curveAreaPath: string = '';
  totalMonthExpenses: number = 0;
  peakWeek: WeeklyExpensePoint | null = null;
  selectedPoint: WeeklyExpensePoint | null = null;

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
        this.computeWeeklyExpenseCurve(this.recentExpenses);
        this.loadData();
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.expenseDeleted$.subscribe((deletedId) => {
        this.recentExpenses = this.recentExpenses.filter((e) => e.id !== deletedId);
        this.computeWeeklyExpenseCurve(this.recentExpenses);
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

    this.subs.add(
      this.taskSelectionService.budgetUpdated$.subscribe(() => {
        this.loadData();
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.budgetDeleted$.subscribe(() => {
        this.loadData();
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.projectCreated$.subscribe(() => {
        this.loadData();
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.projectDeleted$.subscribe(() => {
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
        this.recentExpenses = res?.expenses || [];
        this.computeWeeklyExpenseCurve(this.recentExpenses);
        this.cdr.detectChanges();
      },
    });
  }

  computeWeeklyExpenseCurve(expenses: Expense[]) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const weeklySums = [0, 0, 0, 0];
    let totalMonth = 0;

    expenses.forEach((exp) => {
      const expDate = new Date(exp.date);
      if (expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth) {
        const day = expDate.getDate();
        const amount = Number(exp.amount) || 0;
        totalMonth += amount;

        if (day <= 7) {
          weeklySums[0] += amount;
        } else if (day <= 14) {
          weeklySums[1] += amount;
        } else if (day <= 21) {
          weeklySums[2] += amount;
        } else {
          weeklySums[3] += amount;
        }
      }
    });

    this.totalMonthExpenses = totalMonth;

    const maxAmount = Math.max(...weeklySums, 1);
    const xCoordinates = [50, 180, 310, 450];
    const yBaseline = 125;
    const yPeak = 25;
    const heightRange = yBaseline - yPeak; // 100px

    const monthNames = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
    ];
    const currentMonthName = monthNames[currentMonth];

    const ranges = [
      `1 - 7 ${currentMonthName}`,
      `8 - 14 ${currentMonthName}`,
      `15 - 21 ${currentMonthName}`,
      `22 - ${lastDayOfMonth} ${currentMonthName}`,
    ];

    const points: WeeklyExpensePoint[] = weeklySums.map((amount, idx) => {
      const x = xCoordinates[idx];
      let y = yBaseline;
      if (amount > 0) {
        const ratio = amount / maxAmount;
        y = Math.round(yBaseline - ratio * heightRange);
      }
      return {
        weekIndex: idx + 1,
        label: `Semaine ${idx + 1}`,
        rangeLabel: ranges[idx],
        amount,
        x,
        y,
      };
    });

    this.weeklyExpensePoints = points;

    const maxWeek = [...points].sort((a, b) => b.amount - a.amount)[0];
    this.peakWeek = maxWeek && maxWeek.amount > 0 ? maxWeek : null;
    this.selectedPoint = this.peakWeek || points[points.length - 1];

    const p0 = points[0];
    const p1 = points[1];
    const p2 = points[2];
    const p3 = points[3];

    // Spline cubique douce
    const cp1x = p0.x + (p1.x - p0.x) * 0.5;
    const cp1y = p0.y;
    const cp2x = p1.x - (p2.x - p0.x) * 0.2;
    const cp2y = p1.y;

    const cp3x = p1.x + (p2.x - p0.x) * 0.2;
    const cp3y = p1.y;
    const cp4x = p2.x - (p3.x - p1.x) * 0.2;
    const cp4y = p2.y;

    const cp5x = p2.x + (p3.x - p1.x) * 0.2;
    const cp5y = p2.y;
    const cp6x = p3.x - (p3.x - p2.x) * 0.5;
    const cp6y = p3.y;

    this.curvePath = `M ${p0.x},${p0.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y} C ${cp3x},${cp3y} ${cp4x},${cp4y} ${p2.x},${p2.y} C ${cp5x},${cp5y} ${cp6x},${cp6y} ${p3.x},${p3.y}`;
    this.curveAreaPath = `${this.curvePath} L ${p3.x},150 L ${p0.x},150 Z`;
  }

  selectChartPoint(point: WeeklyExpensePoint) {
    this.selectedPoint = point;
    this.cdr.detectChanges();
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

  deleteTask(task: Task, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (confirm(`Voulez-vous vraiment supprimer la tâche "${task.title}" ?`)) {
      this.tasksService.remove(task.id).subscribe({
        next: () => {
          this.allTasks = this.allTasks.filter((t) => t.id !== task.id);
          this.taskSelectionService.notifyTaskDeleted(task.id);
          this.loadData();
          this.cdr.detectChanges();
        },
        error: (err) => {
          alert(err.error?.message || 'Erreur lors de la suppression de la tâche');
        },
      });
    }
  }
}
