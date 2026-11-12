import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { SearchResponse, SearchScopeType } from '../models/search.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
   private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  search(
    query: string,
    page: number = 1,
    limit: number = 6,
    type: SearchScopeType = 'all',
  ): Observable<SearchResponse> {
    let params = new HttpParams()
      .set('q', query.trim())
      .set('page', String(page))
      .set('limit', String(limit))
      .set('type', type);

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((res) => res.data || res),
    );
  }
}
