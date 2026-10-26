export type NotificationType =
  | 'TASK_OVERDUE'
  | 'BUDGET_EXCEEDED'
  | 'BUDGET_WARNING'
  | 'TASK_BLOCKED';

export type NotificationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface SystemNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  createdAt: string;
  actionUrl: string;
  actionLabel: string;
  metadata?: Record<string, any>;
  isRead?: boolean;
}

export interface NotificationResponse {
  total: number;
  counts: {
    critical: number;
    warning: number;
    info: number;
    overdueTasks: number;
    budgetAlerts: number;
  };
  notifications: SystemNotification[];
}
