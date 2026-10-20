import { Component, OnInit } from '@angular/core';
import { TasksService } from '../../core/services/tasks.service';
import { TaskSelectionService } from '../../core/services/task-selection.service';
import { Task, TaskStatus } from '../../core/models/task.models';

@Component({
  selector: 'app-tasks',
  standalone: false,
  template: `
    <div class="space-y-6 pb-12">
      <!-- Header & Create Button -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-900 dark:text-white">Gestion des Tâches</h1>
          <p class="text-xs text-slate-400 mt-1">Organisez vos tâches, sous-tâches et dépendances bloquantes</p>
        </div>
        <button
          (click)="taskSelectionService.openCreateTask()"
          class="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <app-icon name="plus" [size]="15"></app-icon>
          <span>Créer une tâche</span>
        </button>
      </div>

      <!-- Filters & Search Bar -->
      <div class="flex flex-wrap items-center gap-2 pb-2">
        <button
          (click)="setFilter('ALL')"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
          [class.bg-brand-600]="activeFilter === 'ALL'"
          [class.text-white]="activeFilter === 'ALL'"
          [class.bg-white]="activeFilter !== 'ALL'"
          [class.dark:bg-surface-cardDark]="activeFilter !== 'ALL'"
          [class.text-slate-600]="activeFilter !== 'ALL'"
          [class.dark:text-slate-300]="activeFilter !== 'ALL'"
        >
          Toutes ({{ tasks.length }})
        </button>

        <button
          (click)="setFilter('TODO')"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
          [class.bg-brand-600]="activeFilter === 'TODO'"
          [class.text-white]="activeFilter === 'TODO'"
          [class.bg-white]="activeFilter !== 'ALL'"
          [class.dark:bg-surface-cardDark]="activeFilter !== 'ALL'"
          [class.text-slate-600]="activeFilter !== 'ALL'"
          [class.dark:text-slate-300]="activeFilter !== 'ALL'"
        >
          À faire
        </button>

        <button
          (click)="setFilter('IN_PROGRESS')"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
          [class.bg-brand-600]="activeFilter === 'IN_PROGRESS'"
          [class.text-white]="activeFilter === 'IN_PROGRESS'"
          [class.bg-white]="activeFilter !== 'IN_PROGRESS'"
          [class.dark:bg-surface-cardDark]="activeFilter !== 'IN_PROGRESS'"
          [class.text-slate-600]="activeFilter !== 'IN_PROGRESS'"
        >
          En cours
        </button>

        <button
          (click)="setFilter('BLOCKED')"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
          [class.bg-rose-600]="activeFilter === 'BLOCKED'"
          [class.text-white]="activeFilter === 'BLOCKED'"
          [class.bg-white]="activeFilter !== 'BLOCKED'"
          [class.dark:bg-surface-cardDark]="activeFilter !== 'BLOCKED'"
          [class.text-rose-600]="activeFilter !== 'BLOCKED'"
        >
          Bloquées
        </button>

        <button
          (click)="setFilter('DONE')"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
          [class.bg-emerald-600]="activeFilter === 'DONE'"
          [class.text-white]="activeFilter === 'DONE'"
          [class.bg-white]="activeFilter !== 'DONE'"
          [class.dark:bg-surface-cardDark]="activeFilter !== 'DONE'"
          [class.text-slate-600]="activeFilter !== 'DONE'"
        >
          Terminées
        </button>

        <button
          (click)="setFilter('OVERDUE')"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors text-rose-600"
          [class.bg-rose-600]="activeFilter === 'OVERDUE'"
          [class.text-white]="activeFilter === 'OVERDUE'"
        >
          En retard
        </button>
      </div>

      <!-- Tasks List Card -->
      <div class="rounded-3xl bg-white dark:bg-surface-cardDark border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden">
        @if (filteredTasks.length === 0) {
          <div class="py-16 text-center">
            <div class="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <app-icon name="tasks" [size]="24"></app-icon>
            </div>
            <p class="text-sm font-bold text-slate-800 dark:text-slate-200">Aucune tâche trouvée</p>
            <p class="text-xs text-slate-400 mt-1">Créez votre première tâche pour commencer.</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (task of filteredTasks; track task.id) {
              <div
                (click)="taskSelectionService.selectTask(task)"
                class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
              >
                <div class="flex items-start gap-3.5 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    [checked]="task.status === 'DONE'"
                    (click)="$event.stopPropagation(); toggleTaskDone(task)"
                    class="mt-1 rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" [class.line-through]="task.status === 'DONE'">
                        {{ task.title }}
                      </h3>
                      @if (task.isBlockedByDeps) {
                        <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center gap-1">
                          <app-icon name="alert" [size]="10"></app-icon> Bloquée
                        </span>
                      }
                      @if (task.isOverdue) {
                        <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                          En retard
                        </span>
                      }
                    </div>

                    <div class="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      @if (task.project) {
                        <span class="font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                          <app-icon name="projects" [size]="12"></app-icon>
                          {{ task.project.title }}
                        </span>
                        <span>&bull;</span>
                      }
                      @if (task.dueDate) {
                        <span>Échéance: {{ task.dueDate | date:'dd MMM yyyy' }}</span>
                        <span>&bull;</span>
                      }
                      <span>Estimé: {{ task.estimatedMinutes }} min</span>
                      @if (task.totalLoggedMinutes) {
                        <span>&bull; Logué: {{ task.totalLoggedMinutes }} min</span>
                      }
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span
                    class="text-[10px] font-bold px-2.5 py-1 rounded-xl"
                    [class.bg-rose-100]="task.priority === 'URGENT'"
                    [class.text-rose-700]="task.priority === 'URGENT'"
                    [class.bg-amber-100]="task.priority === 'HIGH'"
                    [class.text-amber-700]="task.priority === 'HIGH'"
                    [class.bg-slate-100]="task.priority === 'NORMAL' || task.priority === 'LOW'"
                    [class.text-slate-600]="task.priority === 'NORMAL' || task.priority === 'LOW'"
                  >
                    {{ task.priority }}
                  </span>

                  <span
                    class="text-[10px] font-bold px-2.5 py-1 rounded-xl"
                    [class.bg-emerald-50]="task.status === 'DONE'"
                    [class.text-emerald-700]="task.status === 'DONE'"
                    [class.bg-blue-50]="task.status === 'IN_PROGRESS'"
                    [class.text-blue-700]="task.status === 'IN_PROGRESS'"
                    [class.bg-rose-50]="task.status === 'BLOCKED'"
                    [class.text-rose-700]="task.status === 'BLOCKED'"
                    [class.bg-slate-100]="task.status === 'TODO'"
                    [class.text-slate-600]="task.status === 'TODO'"
                  >
                    {{ task.status }}
                  </span>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class TasksComponent implements OnInit {
  tasks: Task[] = [];
  activeFilter: string = 'ALL';

  constructor(
    private tasksService: TasksService,
    public taskSelectionService: TaskSelectionService,
  ) {}

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.tasksService.findAll().subscribe({
      next: (tasks) => (this.tasks = tasks),
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
  }

  toggleTaskDone(task: Task) {
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    this.tasksService.updateStatus(task.id, nextStatus as any).subscribe({
      next: () => this.loadTasks(),
      error: (err) => alert(err.error?.message || 'Erreur lors du changement de statut'),
    });
  }
}
