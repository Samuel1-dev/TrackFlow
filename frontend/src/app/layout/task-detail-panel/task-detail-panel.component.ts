import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { TaskSelectionService } from '../../core/services/task-selection.service';
import { TasksService } from '../../core/services/tasks.service';
import { FinanceService } from '../../core/services/finance.service';
import { Task, TaskStatus } from '../../core/models/task.models';
import { ActiveBudget } from '../../core/models/finance.models';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';

@Component({
  selector: 'app-task-detail-panel',
  standalone: false,
  templateUrl: './task-detail-panel.component.html',
  styleUrl: './task-detail-panel.component.scss',
})
export class TaskDetailPanelComponent implements OnInit, OnDestroy {
  logMinutes: number = 30;
  newSubtaskTitle: string = '';
  isAddingSubtask: boolean = false;
  activeBudget: ActiveBudget | null = null;
  private subs: Subscription = new Subscription();

  constructor(
    public taskSelectionService: TaskSelectionService,
    private tasksService: TasksService,
    private financeService: FinanceService,
    private cdr: ChangeDetectorRef,
    private confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit() {
    this.loadActiveBudget();

    // Recharger le budget en temps réel sur création, modification ou suppression de budget/dépense
    this.subs.add(
      this.taskSelectionService.budgetCreated$.subscribe(() => {
        this.loadActiveBudget();
      }),
    );
    this.subs.add(
      this.taskSelectionService.budgetUpdated$.subscribe(() => {
        this.loadActiveBudget();
      }),
    );
    this.subs.add(
      this.taskSelectionService.budgetDeleted$.subscribe(() => {
        this.activeBudget = null;
        this.cdr.detectChanges();
        this.loadActiveBudget();
      }),
    );
    this.subs.add(
      this.taskSelectionService.expenseCreated$.subscribe(() => {
        this.loadActiveBudget();
      }),
    );
    this.subs.add(
      this.taskSelectionService.expenseDeleted$.subscribe(() => {
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
        this.activeBudget = res && res.activeBudget ? res.activeBudget : null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.activeBudget = null;
        this.cdr.detectChanges();
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
        this.confirmDialog.alert(err.error?.message || 'Erreur lors du changement de statut');
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

  addSubtask(parentTaskId: string) {
    const title = this.newSubtaskTitle.trim();
    if (!title) return;

    const current = this.task();
    this.isAddingSubtask = true;

    this.tasksService
      .create({
        title,
        parentTaskId,
        projectId: current?.projectId || undefined,
        status: 'TODO',
      })
      .subscribe({
        next: () => {
          this.newSubtaskTitle = '';
          this.isAddingSubtask = false;
          this.tasksService.findOne(parentTaskId).subscribe((fresh) => {
            this.taskSelectionService.updateSelectedTask(fresh);
            this.taskSelectionService.notifyTaskUpdated(fresh);
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.isAddingSubtask = false;
          this.confirmDialog.alert(err.error?.message || "Erreur lors de l'ajout de la sous-tâche");
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
        this.confirmDialog.alert(err.error?.message || "Erreur lors de l'enregistrement du temps");
      },
    });
  }

  deleteTask(taskId: string) {
    this.confirmDialog.open({
      title: 'Supprimer la tâche',
      message: 'Voulez-vous vraiment supprimer cette tâche ?',
      confirmLabel: 'Supprimer',
      danger: true,
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.tasksService.remove(taskId).subscribe({
        next: () => {
          this.taskSelectionService.notifyTaskDeleted(taskId);
          this.close();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.confirmDialog.alert(err.error?.message || 'Erreur lors de la suppression de la tâche');
        },
      });
    });
  }

  deleteSubtask(subId: string) {
    this.confirmDialog.open({
      title: 'Supprimer la sous-tâche',
      message: 'Voulez-vous vraiment supprimer cette sous-tâche ?',
      confirmLabel: 'Supprimer',
      danger: true,
    }).subscribe((confirmed) => {
      if (!confirmed) return;
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
          this.confirmDialog.alert(err.error?.message || 'Erreur lors de la suppression de la sous-tâche');
        },
      });
    });
  }

  getSubtasksDoneCount(task: Task): number {
    return (task.subTasks || []).filter((s) => s.status === 'DONE').length;
  }

  getTimeProgressPercent(task: Task): number {
    if (!task.estimatedMinutes || task.estimatedMinutes <= 0) return 0;
    return Math.min(100, Math.round(((task.totalLoggedMinutes || 0) / task.estimatedMinutes) * 100));
  }
}
