import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { User, AuthResponse, LoginDto, RegisterDto } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:3000/api/v1';
  private readonly tokenKey = 'taskflow_access_token';
  private readonly refreshKey = 'taskflow_refresh_token';
  private readonly userKey = 'taskflow_user';

  public readonly currentUser = signal<User | null>(this.getStoredUser());
  public readonly isAuthenticated = computed(() => !!this.currentUser());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshKey);
  }

  private getStoredUser(): User | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  register(dto: RegisterDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/register`, dto).pipe(
      tap((res) => {
        if (res.data) {
          this.handleAuthSuccess(res.data);
        }
      }),
    );
  }

  login(dto: LoginDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/login`, dto).pipe(
      tap((res) => {
        if (res.data) {
          this.handleAuthSuccess(res.data);
        }
      }),
    );
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<any>(`${this.baseUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          if (res.data?.accessToken) {
            localStorage.setItem(this.tokenKey, res.data.accessToken);
            if (res.data.refreshToken) {
              localStorage.setItem(this.refreshKey, res.data.refreshToken);
            }
          }
        }),
      );
  }

  loadProfile(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/users/me`).pipe(
      tap((res) => {
        if (res.data) {
          this.currentUser.set(res.data);
          localStorage.setItem(this.userKey, JSON.stringify(res.data));
        }
      }),
      catchError((err) => {
        if (err.status === 401) {
          this.logout();
        }
        return of(null);
      }),
    );
  }

  logout() {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${this.baseUrl}/auth/logout`, { refreshToken }).subscribe({
        error: () => {},
      });
    }
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  private handleAuthSuccess(data: AuthResponse) {
    localStorage.setItem(this.tokenKey, data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem(this.refreshKey, data.refreshToken);
    }
    this.currentUser.set(data.user);
    localStorage.setItem(this.userKey, JSON.stringify(data.user));
  }
}
