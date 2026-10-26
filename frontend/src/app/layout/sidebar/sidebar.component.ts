import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { TaskSelectionService } from '../../core/services/task-selection.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input() isMobileOpen: boolean = false;
  @Output() closeMobileSidebar = new EventEmitter<void>();

  constructor(
    private router: Router,
    public taskSelectionService: TaskSelectionService,
    public notificationService: NotificationService,
  ) {}

  get isCollapsed(): boolean {
    // Sur mobile, la sidebar est toujours déployée dans son tiroir
    if (this.isMobileOpen) return false;
    return this.taskSelectionService.isLeftSidebarCollapsed();
  }

  toggleCollapse() {
    this.taskSelectionService.toggleLeftSidebar();
  }

  onNavigate() {
    this.closeMobileSidebar.emit();
  }

  openNewTask() {
    this.taskSelectionService.openCreateTask();
    this.closeMobileSidebar.emit();
  }

  openNewBudget() {
    this.taskSelectionService.openCreateBudget();
    this.closeMobileSidebar.emit();
  }

  openNewExpense() {
    this.taskSelectionService.openCreateExpense();
    this.closeMobileSidebar.emit();
  }
}
