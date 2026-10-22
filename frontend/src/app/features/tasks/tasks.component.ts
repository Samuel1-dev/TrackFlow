import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { TasksService } from '../../core/services/tasks.service';
import { TaskSelectionService } from '../../core/services/task-selection.service';
import { Task, TaskStatus } from '../../core/models/task.models';

@Component({
  selector: 'app-tasks',
  standalone: false,
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
})
export class TasksComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];
  activeFilter: string = 'ALL';
  private subs: Subscription = new Subscription();

  constructor(
    private tasksService: TasksService,
    public taskSelectionService: TaskSelectionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadTasks();

    // Écoute réactive temps réel des ajouts, modifications et suppressions
    this.subs.add(
      this.taskSelectionService.taskCreated$.subscribe((newTask) => {
        this.tasks.unshift(newTask);
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.taskUpdated$.subscribe((updatedTask) => {
        const idx = this.tasks.findIndex((t) => t.id === updatedTask.id);
        if (idx !== -1) {
          this.tasks[idx] = updatedTask;
        } else {
          this.loadTasks();
        }
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.taskDeleted$.subscribe((deletedId) => {
        this.tasks = this.tasks.filter((t) => t.id !== deletedId);
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.taskSelectionService.projectDeleted$.subscribe(() => {
        this.loadTasks();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  loadTasks() {
    this.tasksService.findAll().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.cdr.detectChanges();
      },
    });
  }

  get filteredTasks(): Task[] {
    if (this.activeFilter === 'ALL') return this.tasks;
    if (this.activeFilter === 'OVERDUE') return this.tasks.filter((t) => t.isOverdue);
    if (this.activeFilter === 'BLOCKED') return this.tasks.filter((t) => t.isBlockedByDeps || t.status === 'BLOCKED');
    return this.tasks.filter((t) => t.status === this.activeFilter);
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
    this.cdr.detectChanges();
  }

  toggleTaskDone(task: Task) {
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    this.tasksService.updateStatus(task.id, nextStatus as any).subscribe({
      next: (updated) => {
        this.taskSelectionService.notifyTaskUpdated(updated);
        const idx = this.tasks.findIndex((t) => t.id === updated.id);
        if (idx !== -1) {
          this.tasks[idx] = updated;
        }
        this.cdr.detectChanges();
      },
      error: (err) => alert(err.error?.message || 'Erreur lors du changement de statut'),
    });
  }

  deleteTask(task: Task, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (confirm(`Voulez-vous vraiment supprimer la tâche "${task.title}" ?`)) {
      this.tasksService.remove(task.id).subscribe({
        next: () => {
          this.tasks = this.tasks.filter((t) => t.id !== task.id);
          this.taskSelectionService.notifyTaskDeleted(task.id);
          this.cdr.detectChanges();
        },
        error: (err) => {
          alert(err.error?.message || 'Erreur lors de la suppression de la tâche');
        },
      });
    }
  }
}
