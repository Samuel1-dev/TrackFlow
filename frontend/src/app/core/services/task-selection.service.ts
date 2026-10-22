import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Task } from '../models/task.models';
import { Expense, ActiveBudget } from '../models/finance.models';
import { Project } from '../models/project.models';

@Injectable({
  providedIn: 'root',
})
export class TaskSelectionService {
  // Tâche sélectionnée pour affichage dans le panneau droit
  public readonly selectedTask = signal<Task | null>(null);

  // État d'ouverture du panneau droit (particulièrement utile sur mobile/tablette)
  public readonly isPanelOpen = signal<boolean>(false);

  // Barres latérales pliables manuellement
  public readonly isLeftSidebarCollapsed = signal<boolean>(false);
  public readonly isRightPanelCollapsed = signal<boolean>(false);

  // Modales d'actions rapides
  public readonly isCreateModalOpen = signal<boolean>(false);
  public readonly isExpenseModalOpen = signal<boolean>(false);
  public readonly isBudgetModalOpen = signal<boolean>(false);
  public readonly isProjectModalOpen = signal<boolean>(false);

  // ─── Flux d'événements réactifs temps réel (sans rechargement de page) ────
  public readonly taskCreated$ = new Subject<Task>();
  public readonly taskUpdated$ = new Subject<Task>();
  public readonly taskDeleted$ = new Subject<string>();

  public readonly expenseCreated$ = new Subject<Expense>();
  public readonly expenseDeleted$ = new Subject<string>();

  public readonly budgetCreated$ = new Subject<ActiveBudget | any>();
  public readonly budgetUpdated$ = new Subject<ActiveBudget | any>();
  public readonly budgetDeleted$ = new Subject<string>();
  public readonly projectCreated$ = new Subject<Project>();
  public readonly projectDeleted$ = new Subject<string>();

  public readonly refreshRequested$ = new Subject<void>();

  selectTask(task: Task) {
    this.selectedTask.set(task);
    this.isPanelOpen.set(true);
    this.isRightPanelCollapsed.set(false);
  }

  updateSelectedTask(task: Task) {
    this.selectedTask.set(task);
    this.taskUpdated$.next(task);
  }

  closePanel() {
    this.selectedTask.set(null);
    this.isPanelOpen.set(false);
  }

  toggleLeftSidebar() {
    this.isLeftSidebarCollapsed.update((v) => !v);
  }

  toggleRightPanel() {
    this.isRightPanelCollapsed.update((v) => !v);
  }

  setRightPanelCollapsed(collapsed: boolean) {
    this.isRightPanelCollapsed.set(collapsed);
  }

  openCreateTask() {
    this.isCreateModalOpen.set(true);
  }

  closeCreateTask() {
    this.isCreateModalOpen.set(false);
  }

  openCreateExpense() {
    this.isExpenseModalOpen.set(true);
  }

  closeCreateExpense() {
    this.isExpenseModalOpen.set(false);
  }

  openCreateBudget() {
    this.isBudgetModalOpen.set(true);
  }

  closeCreateBudget() {
    this.isBudgetModalOpen.set(false);
  }

  openCreateProject() {
    this.isProjectModalOpen.set(true);
  }

  closeCreateProject() {
    this.isProjectModalOpen.set(false);
  }

  // Émetteurs d'événements
  notifyTaskCreated(task: Task) {
    this.taskCreated$.next(task);
  }

  notifyTaskUpdated(task: Task) {
    this.taskUpdated$.next(task);
  }

  notifyTaskDeleted(taskId: string) {
    this.taskDeleted$.next(taskId);
    if (this.selectedTask()?.id === taskId) {
      this.closePanel();
    }
  }

  notifyExpenseCreated(expense: Expense) {
    this.expenseCreated$.next(expense);
  }

  notifyExpenseDeleted(expenseId: string) {
    this.expenseDeleted$.next(expenseId);
  }

  notifyBudgetCreated(budget: any) {
    this.budgetCreated$.next(budget);
  }

  notifyBudgetUpdated(budget: any) {
    this.budgetUpdated$.next(budget);
  }

  notifyBudgetDeleted(budgetId: string) {
    this.budgetDeleted$.next(budgetId);
  }

  notifyProjectCreated(project: Project) {
    this.projectCreated$.next(project);
  }

  notifyProjectDeleted(projectId: string) {
    this.projectDeleted$.next(projectId);
  }

  triggerRefresh() {
    this.refreshRequested$.next();
  }
}
