import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import {
  SystemNotification,
  NotificationResponse,
  NotificationSeverity,
  NotificationType,
} from '../../core/models/notification.models';

export type NotificationFilter = 'ALL' | 'UNREAD' | 'TASKS' | 'BUDGETS';

@Component({
  selector: 'app-notifications',
  standalone: false,
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit, OnDestroy {
  currentFilter: NotificationFilter = 'ALL';
  notifications: SystemNotification[] = [];
  unreadCount: number = 0;
  isLoading: boolean = false;

  counts = {
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    overdueTasks: 0,
    budgetAlerts: 0,
  };

  private notifSub?: Subscription;
  private responseSub?: Subscription;
  private unreadSub?: Subscription;

  constructor(
    public notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isLoading = true;

    this.notifSub = this.notificationService.notifications$.subscribe((items) => {
      this.notifications = items;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });

    this.unreadSub = this.notificationService.unreadCount$.subscribe((count) => {
      this.unreadCount = count;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });

    this.responseSub = this.notificationService.response$.subscribe((res) => {
      if (res) {
        this.counts = {
          total: res.total,
          critical: res.counts.critical,
          warning: res.counts.warning,
          info: res.counts.info,
          overdueTasks: res.counts.overdueTasks,
          budgetAlerts: res.counts.budgetAlerts,
        };
      }
      this.isLoading = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });

    this.notificationService.loadNotifications().subscribe({
      next: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
    this.unreadSub?.unsubscribe();
    this.responseSub?.unsubscribe();
  }

  setFilter(filter: NotificationFilter): void {
    this.currentFilter = filter;
    this.cdr.detectChanges();
  }

  get filteredNotifications(): SystemNotification[] {
    switch (this.currentFilter) {
      case 'UNREAD':
        return this.notifications.filter((n) => !n.isRead);
      case 'TASKS':
        return this.notifications.filter((n) => n.type.startsWith('TASK_'));
      case 'BUDGETS':
        return this.notifications.filter((n) => n.type.startsWith('BUDGET_'));
      case 'ALL':
      default:
        return this.notifications;
    }
  }

  markAsRead(item: SystemNotification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.markAsRead(item.id);
    this.cdr.detectChanges();
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
    this.cdr.detectChanges();
  }

  refresh(): void {
    this.isLoading = true;
    this.notificationService.loadNotifications().subscribe({
      next: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onActionClick(item: SystemNotification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.markAsRead(item);
    if (item.actionUrl) {
      this.router.navigateByUrl(item.actionUrl);
    }
  }

  getIconName(item: SystemNotification): string {
    if (item.type.startsWith('TASK_')) {
      return item.severity === 'CRITICAL' ? 'alert' : 'clock';
    }
    if (item.type.startsWith('BUDGET_')) {
      return item.severity === 'CRITICAL' ? 'alert' : 'budgets';
    }
    return 'bell';
  }

  getSeverityBadge(severity: NotificationSeverity): { label: string; class: string } {
    switch (severity) {
      case 'CRITICAL':
        return {
          label: 'Critique',
          class: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900',
        };
      case 'WARNING':
        return {
          label: 'Avertissement',
          class: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900',
        };
      case 'INFO':
      default:
        return {
          label: 'Information',
          class: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200 dark:border-sky-900',
        };
    }
  }

  getCardTheme(item: SystemNotification): {
    border: string;
    iconBg: string;
    iconColor: string;
  } {
    if (item.severity === 'CRITICAL') {
      return {
        border: 'border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-800',
        iconBg: 'bg-rose-50 dark:bg-rose-950/50',
        iconColor: 'text-rose-600 dark:text-rose-400',
      };
    }
    if (item.severity === 'WARNING') {
      return {
        border: 'border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800',
        iconBg: 'bg-amber-50 dark:bg-amber-950/50',
        iconColor: 'text-amber-600 dark:text-amber-400',
      };
    }
    return {
      border: 'border-l-4 border-l-sky-500 border-slate-200 dark:border-slate-800',
      iconBg: 'bg-sky-50 dark:bg-sky-950/50',
      iconColor: 'text-sky-600 dark:text-sky-400',
    };
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }
}
