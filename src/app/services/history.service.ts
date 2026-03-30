import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, switchMap, forkJoin } from 'rxjs';
import { HistoryRecord } from '../models/history.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private apiUrl = 'http://localhost:3000/history';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getUserId(): string {
    return String(this.authService.getCurrentUser()?.id ?? '');
  }

  getHistory(): Observable<HistoryRecord[]> {
    return this.http.get<HistoryRecord[]>(this.apiUrl).pipe(
      map(records =>
        records
          .filter(r => r.userId === this.getUserId())
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      )
    );
  }

  addRecord(record: HistoryRecord): Observable<HistoryRecord> {
    return this.http.post<HistoryRecord>(this.apiUrl, record);
  }

  markRolledBack(id: string): Observable<HistoryRecord> {
    return this.http.patch<HistoryRecord>(`${this.apiUrl}/${id}`, { rolledBack: true });
  }

  clearHistory(): Observable<void> {
    return this.getHistory().pipe(
      switchMap(records => {
        if (records.length === 0) return of(undefined as void);
        return forkJoin(records.map(r => this.http.delete<void>(`${this.apiUrl}/${r.id}`))).pipe(
          map(() => undefined as void)
        );
      })
    );
  }
}
