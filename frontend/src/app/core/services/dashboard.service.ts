import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { DashboardSummary } from '../models/finance.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
   private readonly baseUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<any>(`${this.baseUrl}/summary`).pipe(
      map((res) => res.data),
    );
  }
}
