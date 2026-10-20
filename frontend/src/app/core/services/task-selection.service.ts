import { Injectable, signal } from '@angular/core';
import { Task } from '../models/task.models';

@Injectable({
  providedIn: 'root',
})
export class TaskSelectionService {
  // Tâche sélectionnée pour affichage dans le panneau droit
  public readonly selectedTask = signal<Task | null>(null);

  // État d'ouverture du panneau droit (particulièrement utile sur mobile/tablette)
  public readonly isPanelOpen = signal<boolean>(false);

  // Indique si le formulaire d'ajout d'une nouvelle tâche est ouvert
  public readonly isCreateModalOpen = signal<boolean>(false);

  // Indique si le formulaire d'ajout d'une dépense est ouvert
  public readonly isExpenseModalOpen = signal<boolean>(false);

  // Indique si le formulaire de budget est ouvert
  public readonly isBudgetModalOpen = signal<boolean>(false);

  // Indique si le formulaire de projet est ouvert
  public readonly isProjectModalOpen = signal<boolean>(false);

  selectTask(task: Task) {
    this.selectedTask.set(task);
    this.isPanelOpen.set(true);
  }

  updateSelectedTask(task: Task) {
    this.selectedTask.set(task);
  }

  closePanel() {
    this.selectedTask.set(null);
    this.isPanelOpen.set(false);
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
}
