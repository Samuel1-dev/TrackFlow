import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { TaskSelectionService } from './task-selection.service';
import {
  NotificationResponse,
  SystemNotification,
} from '../models/notification.models';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly baseUrl = 'http://localhost:3000/api/v1/notifications';

  private notificationsSubject = new BehaviorSubject<SystemNotification[]>([]);
  public readonly notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public readonly unreadCount$ = this.unreadCountSubject.asObservable();

  private responseSubject = new BehaviorSubject<NotificationResponse | null>(null);
  public readonly response$ = this.responseSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private taskSelectionService: TaskSelectionService,
  ) {
    this.initRealtimeSync();
  }

  private getStorageKey(): string {
    const userId = this.authService.currentUser()?.id || 'guest';
    return `taskflow_read_notifications_${userId}`;
  }

  private getReadIds(): Set<string> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return new Set();
      }
      const raw = localStorage.getItem(this.getStorageKey());
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch {
      return new Set();
    }
  }

  private saveReadIds(set: Set<string>): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(Array.from(set)));
      }
    } catch {}
  }

  loadNotifications(): Observable<NotificationResponse> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((res) => res.data || res),
      map((data: NotificationResponse) => {
        const readIds = this.getReadIds();
        const enriched = (data.notifications || []).map((n) => ({
          ...n,
          isRead: readIds.has(n.id),
        }));

        const unreadCount = enriched.filter((n) => !n.isRead).length;

        this.notificationsSubject.next(enriched);
        this.unreadCountSubject.next(unreadCount);
        this.responseSubject.next(data);

        return {
          ...data,
          notifications: enriched,
        };
      }),
    );
  }

  markAsRead(notificationId: string): void {
    const readIds = this.getReadIds();
    readIds.add(notificationId);
    this.saveReadIds(readIds);

    const current = this.notificationsSubject.value.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n,
    );
    this.notificationsSubject.next(current);
    this.unreadCountSubject.next(current.filter((n) => !n.isRead).length);
  }

  markAllAsRead(): void {
    const readIds = this.getReadIds();
    this.notificationsSubject.value.forEach((n) => readIds.add(n.id));
    this.saveReadIds(readIds);

    const current = this.notificationsSubject.value.map((n) => ({
      ...n,
      isRead: true,
    }));
    this.notificationsSubject.next(current);
    this.unreadCountSubject.next(0);
  }

  private initRealtimeSync(): void {
    // Recharger immédiatement si l'utilisateur est connecté
    if (this.authService.getToken()) {
      this.loadNotifications().subscribe({ error: () => {} });
    }

    // Réagir aux changements métier (création/suppression/mise à jour de tâche, dépense, budget)
    this.taskSelectionService.taskCreated$.subscribe(() => this.reloadSilently());
    this.taskSelectionService.taskUpdated$.subscribe(() => this.reloadSilently());
    this.taskSelectionService.taskDeleted$.subscribe(() => this.reloadSilently());

    this.taskSelectionService.expenseCreated$.subscribe(() => this.reloadSilently());
    this.taskSelectionService.expenseDeleted$.subscribe(() => this.reloadSilently());

    this.taskSelectionService.budgetCreated$.subscribe(() => this.reloadSilently());
    this.taskSelectionService.budgetUpdated$.subscribe(() => this.reloadSilently());
    this.taskSelectionService.budgetDeleted$.subscribe(() => this.reloadSilently());
  }

  private reloadSilently(): void {
    if (this.authService.getToken()) {
      this.loadNotifications().subscribe({ error: () => {} });
    }
  }
}
