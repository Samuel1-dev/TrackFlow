import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Task, CreateTaskDto, TaskStatus, WeeklyStats, TimeLog } from '../models/task.models';

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private readonly baseUrl = 'http://localhost:3000/api/v1/tasks';

  constructor(private http: HttpClient) {}

  findAll(filters?: {
    status?: TaskStatus;
    priority?: string;
    projectId?: string;
    search?: string;
    isOverdue?: boolean;
    isBlocked?: boolean;
    today?: boolean;
  }): Observable<Task[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((res) => res.data || []),
    );
  }

  findOne(id: string): Observable<Task> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((res) => res.data),
    );
  }

  create(dto: CreateTaskDto): Observable<Task> {
    return this.http.post<any>(this.baseUrl, dto).pipe(
      map((res) => res.data),
    );
  }

  update(id: string, dto: Partial<CreateTaskDto>): Observable<Task> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, dto).pipe(
      map((res) => res.data),
    );
  }

  updateStatus(id: string, status: TaskStatus): Observable<Task> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/status`, { status }).pipe(
      map((res) => res.data),
    );
  }

  remove(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(
      map((res) => res.data),
    );
  }

  getWeeklyStats(): Observable<WeeklyStats> {
    return this.http.get<any>(`${this.baseUrl}/weekly-stats`).pipe(
      map((res) => res.data),
    );
  }

  // Time tracking
  addTimeLog(taskId: string, durationMinutes: number, startedAt: string, notes?: string): Observable<TimeLog> {
    return this.http.post<any>(`${this.baseUrl}/${taskId}/time-logs`, {
      durationMinutes,
      startedAt,
      notes,
    }).pipe(
      map((res) => res.data),
    );
  }

  getTimeLogs(taskId: string): Observable<{
    logs: TimeLog[];
    totalLoggedMinutes: number;
    estimatedMinutes: number;
    varianceMinutes: number;
    isOverEstimate: boolean;
  }> {
    return this.http.get<any>(`${this.baseUrl}/${taskId}/time-logs`).pipe(
      map((res) => res.data),
    );
  }

  deleteTimeLog(taskId: string, logId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${taskId}/time-logs/${logId}`).pipe(
      map((res) => res.data),
    );
  }
}
