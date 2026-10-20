import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ActiveBudgetResponse,
  Expense,
  ExpenseCategory,
} from '../models/finance.models';

@Injectable({
  providedIn: 'root',
})
export class FinanceService {
  private readonly baseUrl = 'http://localhost:3000/api/v1/finance';

  constructor(private http: HttpClient) {}

  getActiveBudget(): Observable<ActiveBudgetResponse> {
    return this.http.get<any>(`${this.baseUrl}/budgets/active`).pipe(
      map((res) => res.data),
    );
  }

  createBudget(dto: {
    periodType: 'WEEKLY' | 'MONTHLY';
    startDate: string;
    endDate: string;
    initialAmount: number;
    savingsTarget: number;
    currency?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/budgets`, dto).pipe(
      map((res) => res.data),
    );
  }

  getBudgetHistory(page = 1, limit = 10): Observable<any> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<any>(`${this.baseUrl}/budgets/history`, { params }).pipe(
      map((res) => res.data),
    );
  }

  getCategories(): Observable<ExpenseCategory[]> {
    return this.http.get<any>(`${this.baseUrl}/categories`).pipe(
      map((res) => res.data || []),
    );
  }

  getExpenses(filters?: {
    categoryId?: string;
    from?: string;
    to?: string;
    search?: string;
  }): Observable<{ expenses: Expense[]; totalSpent: number; count: number }> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params = params.set(key, String(value));
      });
    }

    return this.http.get<any>(`${this.baseUrl}/expenses`, { params }).pipe(
      map((res) => res.data || { expenses: [], totalSpent: 0, count: 0 }),
    );
  }

  createExpense(dto: {
    categoryId: string;
    amount: number;
    date: string;
    description?: string;
  }): Observable<Expense> {
    return this.http.post<any>(`${this.baseUrl}/expenses`, dto).pipe(
      map((res) => res.data),
    );
  }

  deleteExpense(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/expenses/${id}`).pipe(
      map((res) => res.data),
    );
  }
}
