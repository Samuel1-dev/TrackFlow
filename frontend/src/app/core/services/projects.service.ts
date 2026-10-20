import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Project, CreateProjectDto, ProjectStatus } from '../models/project.models';

@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  private readonly baseUrl = 'http://localhost:3000/api/v1/projects';

  constructor(private http: HttpClient) {}

  findAll(status?: ProjectStatus): Observable<Project[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((res) => res.data || []),
    );
  }

  findOne(id: string): Observable<Project> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((res) => res.data),
    );
  }

  create(dto: CreateProjectDto): Observable<Project> {
    return this.http.post<any>(this.baseUrl, dto).pipe(
      map((res) => res.data),
    );
  }

  update(id: string, dto: Partial<CreateProjectDto>): Observable<Project> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, dto).pipe(
      map((res) => res.data),
    );
  }

  remove(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(
      map((res) => res.data),
    );
  }
}
