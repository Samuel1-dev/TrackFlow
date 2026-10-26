import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NotificationsComponent } from './notifications.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NotificationsComponent, IconComponent],
      imports: [HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter notifications by tab', () => {
    component.notifications = [
      {
        id: 'task-1',
        type: 'TASK_OVERDUE',
        severity: 'CRITICAL',
        title: 'Tâche en retard',
        message: 'Délai dépassé',
        createdAt: new Date().toISOString(),
        actionUrl: '/tasks',
        actionLabel: 'Voir la tâche',
        isRead: false,
      },
      {
        id: 'budget-1',
        type: 'BUDGET_EXCEEDED',
        severity: 'CRITICAL',
        title: 'Budget dépassé',
        message: 'Excédent',
        createdAt: new Date().toISOString(),
        actionUrl: '/finance/budgets',
        actionLabel: 'Ajuster le budget',
        isRead: true,
      },
    ];

    component.setFilter('ALL');
    expect(component.filteredNotifications.length).toBe(2);

    component.setFilter('UNREAD');
    expect(component.filteredNotifications.length).toBe(1);
    expect(component.filteredNotifications[0].id).toBe('task-1');

    component.setFilter('TASKS');
    expect(component.filteredNotifications.length).toBe(1);
    expect(component.filteredNotifications[0].id).toBe('task-1');

    component.setFilter('BUDGETS');
    expect(component.filteredNotifications.length).toBe(1);
    expect(component.filteredNotifications[0].id).toBe('budget-1');
  });
});
