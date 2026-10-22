import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { TaskSelectionService } from '../../core/services/task-selection.service';
import { TasksService } from '../../core/services/tasks.service';
import { FinanceService } from '../../core/services/finance.service';
import { Task, TaskStatus } from '../../core/models/task.models';
import { ActiveBudget } from '../../core/models/finance.models';

@Component({
  selector: 'app-task-detail-panel',
  standalone: false,
  templateUrl: './task-detail-panel.component.html',
  styleUrl: './task-detail-panel.component.scss',
})
export class TaskDetailPanelComponent implements OnInit, OnDestroy {
  logMinutes: number = 30;
  activeBudget: ActiveBudget | null = null;
  private subs: Subscription = new Subscription();

  constructor(
    public taskSelectionService: TaskSelectionService,
    private tasksService: TasksService,
    private financeService: FinanceService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadActiveBudget();

    // Recharger le budget dès qu'un budget est créé ou une dépense ajoutée
    this.subs.add(
      this.taskSelectionService.budgetCreated$.subscribe(() => {
        this.loadActiveBudget();
      }),
    );
    this.subs.add(
      this.taskSelectionService.expenseCreated$.subscribe(() => {
        this.loadActiveBudget();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  get task() {
    return this.taskSelectionService.selectedTask;
  }

  loadActiveBudget() {
    this.financeService.getActiveBudget().subscribe({
      next: (res) => {
        if (res && res.activeBudget) {
          this.activeBudget = res.activeBudget;
          this.cdr.detectChanges();
        }
      },
    });
  }

  close() {
    this.taskSelectionService.closePanel();
    this.cdr.detectChanges();
  }

  collapsePanel() {
    this.taskSelectionService.setRightPanelCollapsed(true);
    this.cdr.detectChanges();
  }

  onStatusChange(event: Event) {
    const newStatus = (event.target as HTMLSelectElement).value as TaskStatus;
    const current = this.task();
    if (!current) return;

    this.tasksService.updateStatus(current.id, newStatus).subscribe({
      next: (updated) => {
        this.taskSelectionService.updateSelectedTask(updated);
        this.taskSelectionService.notifyTaskUpdated(updated);
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert(err.error?.message || 'Erreur lors du changement de statut');
      },
    });
  }

  toggleSubtask(sub: any) {
    const newStatus = sub.status === 'DONE' ? 'TODO' : 'DONE';
    this.tasksService.updateStatus(sub.id, newStatus as TaskStatus).subscribe({
      next: () => {
        const current = this.task();
        if (current) {
          this.tasksService.findOne(current.id).subscribe((fresh) => {
            this.taskSelectionService.updateSelectedTask(fresh);
            this.taskSelectionService.notifyTaskUpdated(fresh);
            this.cdr.detectChanges();
          });
        }
      },
    });
  }

  addTime(taskId: string) {
    if (!this.logMinutes || this.logMinutes <= 0) return;
    this.tasksService.addTimeLog(taskId, this.logMinutes, new Date().toISOString()).subscribe({
      next: () => {
        this.tasksService.findOne(taskId).subscribe((fresh) => {
          this.taskSelectionService.updateSelectedTask(fresh);
          this.taskSelectionService.notifyTaskUpdated(fresh);
          this.logMinutes = 30;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        alert(err.error?.message || "Erreur lors de l'enregistrement du temps");
      },
    });
  }

  deleteTask(taskId: string) {
    if (confirm('Voulez-vous vraiment supprimer cette tâche ?')) {
      this.tasksService.remove(taskId).subscribe({
        next: () => {
          this.taskSelectionService.notifyTaskDeleted(taskId);
          this.close();
          this.cdr.detectChanges();
        },
        error: (err) => {
          alert(err.error?.message || 'Erreur lors de la suppression de la tâche');
        },
      });
    }
  }

  deleteSubtask(subId: string) {
    if (confirm('Voulez-vous vraiment supprimer cette sous-tâche ?')) {
      this.tasksService.remove(subId).subscribe({
        next: () => {
          const current = this.task();
          if (current) {
            this.tasksService.findOne(current.id).subscribe((fresh) => {
              this.taskSelectionService.updateSelectedTask(fresh);
              this.taskSelectionService.notifyTaskUpdated(fresh);
              this.cdr.detectChanges();
            });
          }
        },
        error: (err) => {
          alert(err.error?.message || 'Erreur lors de la suppression de la sous-tâche');
        },
      });
    }
  }

  getSubtasksDoneCount(task: Task): number {
    return (task.subTasks || []).filter((s) => s.status === 'DONE').length;
  }

  getTimeProgressPercent(task: Task): number {
    if (!task.estimatedMinutes || task.estimatedMinutes <= 0) return 0;
    return Math.min(100, Math.round(((task.totalLoggedMinutes || 0) / task.estimatedMinutes) * 100));
  }
}
