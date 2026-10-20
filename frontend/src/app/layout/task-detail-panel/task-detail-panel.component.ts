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
  template: `
    <aside
      class="w-full lg:w-96 flex flex-col h-full bg-white dark:bg-surface-cardDark border-l border-slate-100 dark:border-slate-800 transition-all duration-300 z-30"
    >
      <!-- Mode 1: A Task is Selected -> Show Detailed Task Workspace -->
      @if (task(); as currentTask) {
        <div class="h-20 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Détails de la tâche</span>
            @if (currentTask.isBlockedByDeps) {
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center gap-1">
                <app-icon name="alert" [size]="10"></app-icon> Bloquée
              </span>
            }
          </div>
          <button
            (click)="close()"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <app-icon name="x" [size]="18"></app-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Status & Priority Controls -->
          <div class="flex items-center gap-2">
            <!-- Status Dropdown Selector -->
            <select
              [value]="currentTask.status"
              (change)="onStatusChange($event)"
              class="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              [class.bg-emerald-50]="currentTask.status === 'DONE'"
              [class.text-emerald-700]="currentTask.status === 'DONE'"
              [class.bg-blue-50]="currentTask.status === 'IN_PROGRESS'"
              [class.text-blue-700]="currentTask.status === 'IN_PROGRESS'"
              [class.bg-rose-50]="currentTask.status === 'BLOCKED'"
              [class.text-rose-700]="currentTask.status === 'BLOCKED'"
            >
              <option value="TODO">À faire (TODO)</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="DONE">Terminée (DONE)</option>
              <option value="BLOCKED">Bloquée</option>
            </select>

            <!-- Priority Badge -->
            <span
              class="text-xs font-semibold px-2.5 py-1 rounded-xl"
              [class.bg-rose-100]="currentTask.priority === 'URGENT'"
              [class.text-rose-700]="currentTask.priority === 'URGENT'"
              [class.bg-amber-100]="currentTask.priority === 'HIGH'"
              [class.text-amber-700]="currentTask.priority === 'HIGH'"
              [class.bg-slate-100]="currentTask.priority === 'NORMAL' || currentTask.priority === 'LOW'"
              [class.text-slate-600]="currentTask.priority === 'NORMAL' || currentTask.priority === 'LOW'"
            >
              {{ currentTask.priority }}
            </span>
          </div>

          <!-- Title & Project -->
          <div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {{ currentTask.title }}
            </h2>
            @if (currentTask.project) {
              <div class="mt-1 flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-semibold">
                <app-icon name="projects" [size]="13"></app-icon>
                <span>{{ currentTask.project.title }}</span>
              </div>
            }
          </div>

          <!-- Blocking Dependencies Warning (Règle Métier) -->
          @if (currentTask.dependencies && currentTask.dependencies.length > 0) {
            <div class="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-2">
              <div class="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <app-icon name="alert" [size]="14"></app-icon>
                <span>Dépendances Prérequises ({{ currentTask.dependencies.length }})</span>
              </div>
              <p class="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                Cette tâche ne peut pas passer à "En cours" ou "Terminée" tant que ces prérequis ne sont pas terminés :
              </p>
              <div class="space-y-1">
                @for (dep of currentTask.dependencies; track dep.dependsOnTask.id) {
                  <div class="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white/70 dark:bg-slate-900/60">
                    <span class="truncate max-w-[180px] font-medium text-slate-800 dark:text-slate-200">{{ dep.dependsOnTask.title }}</span>
                    <span
                      class="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      [class.bg-emerald-100]="dep.dependsOnTask.status === 'DONE'"
                      [class.text-emerald-700]="dep.dependsOnTask.status === 'DONE'"
                      [class.bg-slate-200]="dep.dependsOnTask.status !== 'DONE'"
                      [class.text-slate-700]="dep.dependsOnTask.status !== 'DONE'"
                    >
                      {{ dep.dependsOnTask.status }}
                    </span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Description -->
          @if (currentTask.description) {
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</p>
              <p class="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl whitespace-pre-wrap leading-relaxed">
                {{ currentTask.description }}
              </p>
            </div>
          }

          <!-- Subtasks Section -->
          @if (currentTask.subTasks && currentTask.subTasks.length > 0) {
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sous-tâches ({{ getSubtasksDoneCount(currentTask) }}/{{ currentTask.subTasks.length }})
                </p>
              </div>
              <div class="space-y-1.5">
                @for (sub of currentTask.subTasks; track sub.id) {
                  <div class="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <input
                      type="checkbox"
                      [checked]="sub.status === 'DONE'"
                      (change)="toggleSubtask(sub)"
                      class="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <span class="text-xs font-medium text-slate-700 dark:text-slate-200 flex-1 truncate" [class.line-through]="sub.status === 'DONE'">
                      {{ sub.title }}
                    </span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Time Tracking (Suivi du Temps Réel) -->
          <div class="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-800/60 dark:to-slate-800/20 border border-slate-100 dark:border-slate-700 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <app-icon name="time" [size]="14" className="text-brand-500"></app-icon> Suivi du temps
              </span>
              <span class="text-xs font-semibold text-slate-500">
                Estimé: {{ currentTask.estimatedMinutes }} min
              </span>
            </div>

            <!-- Variance bar -->
            <div>
              <div class="flex justify-between text-[11px] mb-1 font-semibold">
                <span class="text-slate-600 dark:text-slate-400">Logué : {{ currentTask.totalLoggedMinutes || 0 }} min</span>
                <span [class.text-rose-500]="(currentTask.timeVarianceMinutes || 0) > 0" [class.text-emerald-500]="(currentTask.timeVarianceMinutes || 0) <= 0">
                  Écart: {{ (currentTask.timeVarianceMinutes || 0) > 0 ? '+' : '' }}{{ currentTask.timeVarianceMinutes || 0 }} min
                </span>
              </div>
              <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  class="bg-brand-600 h-full rounded-full transition-all duration-300"
                  [style.width.%]="getTimeProgressPercent(currentTask)"
                ></div>
              </div>
            </div>

            <!-- Quick Log Time Form -->
            <div class="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
              <input
                type="number"
                min="5"
                step="5"
                [(ngModel)]="logMinutes"
                placeholder="Minutes"
                class="w-24 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
              />
              <button
                (click)="addTime(currentTask.id)"
                class="flex-1 py-1.5 px-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <app-icon name="plus" [size]="12"></app-icon> Enregistrer
              </button>
            </div>
          </div>

          <!-- Danger Zone: Delete Task -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              (click)="deleteTask(currentTask.id)"
              class="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-1.5 rounded-xl transition-colors"
            >
              <app-icon name="trash" [size]="14"></app-icon>
              <span>Supprimer cette tâche</span>
            </button>
          </div>
        </div>
      }

      <!-- Mode 2: No Task Selected -> Show Financial Overview (Finora Visa Card + Goals) -->
      @else {
        <div class="h-20 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Aperçu Financier</span>
          <span class="text-[11px] font-semibold text-brand-600 dark:text-brand-400">Mode Veille</span>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Finora Style Gradient Visa Card -->
          <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-tr from-slate-900 via-indigo-950 to-brand-900 text-white shadow-xl shadow-indigo-950/20">
            <div class="flex justify-between items-start mb-6">
              <span class="text-xs font-semibold tracking-wider text-slate-300 uppercase">TaskFlow Card</span>
              <span class="font-extrabold text-sm tracking-widest text-white/90">XOF</span>
            </div>

            <div class="mb-6">
              <p class="text-xs text-slate-400 mb-1">Budget Restant Actif</p>
              <h3 class="text-2xl font-black tracking-tight text-white">
                {{ (activeBudget?.remainingBudget || 0) | fcfa }}
              </h3>
            </div>

            <div class="flex justify-between items-end text-xs text-slate-400">
              <div>
                <p class="text-[10px] uppercase">Alloué Dépenses</p>
                <p class="font-bold text-white">{{ (activeBudget?.availableBudgetForExpenses || 0) | fcfa }}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] uppercase">Objectif Épargne</p>
                <p class="font-bold text-emerald-400">{{ (activeBudget?.savingsTarget || 0) | fcfa }}</p>
              </div>
            </div>

            <!-- Background decorative shapes -->
            <div class="absolute -right-10 -bottom-10 w-36 h-36 rounded-full bg-brand-500/20 blur-2xl"></div>
          </div>

          <!-- Savings Goal Progress Card (matching Finora Goals list) -->
          <div class="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Objectif d'Épargne</h4>
              <span class="text-xs font-bold text-brand-600 dark:text-brand-400">
                {{ activeBudget?.savingsProgressPercent || 0 }}%
              </span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                class="bg-gradient-to-r from-brand-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                [style.width.%]="activeBudget?.savingsProgressPercent || 0"
              ></div>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Épargne estimée actuelle : <strong>{{ (activeBudget?.estimatedSavings || 0) | fcfa }}</strong>
            </p>
          </div>

          <!-- Tip: Click any task -->
          <div class="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-1.5">
            <div class="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 mx-auto flex items-center justify-center">
              <app-icon name="tasks" [size]="16"></app-icon>
            </div>
            <p class="text-xs font-bold text-slate-800 dark:text-slate-200">Sélectionnez une tâche</p>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              Cliquez sur une tâche depuis le tableau de bord ou la liste pour afficher ses sous-tâches, dépendances et suivi du temps ici.
            </p>
          </div>
        </div>
      }
    </aside>
  `,
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
