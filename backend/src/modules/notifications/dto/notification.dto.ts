import { ApiProperty } from '@nestjs/swagger';

export type NotificationType =
  | 'TASK_OVERDUE'
  | 'BUDGET_EXCEEDED'
  | 'BUDGET_WARNING'
  | 'TASK_BLOCKED';

export type NotificationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export class NotificationItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['TASK_OVERDUE', 'BUDGET_EXCEEDED', 'BUDGET_WARNING', 'TASK_BLOCKED'] })
  type: NotificationType;

  @ApiProperty({ enum: ['CRITICAL', 'WARNING', 'INFO'] })
  severity: NotificationSeverity;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  actionUrl: string;

  @ApiProperty()
  actionLabel: string;

  @ApiProperty({ required: false })
  metadata?: Record<string, any>;
}

export class NotificationResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  counts: {
    critical: number;
    warning: number;
    info: number;
    overdueTasks: number;
    budgetAlerts: number;
  };

  @ApiProperty({ type: [NotificationItemDto] })
  notifications: NotificationItemDto[];
}
