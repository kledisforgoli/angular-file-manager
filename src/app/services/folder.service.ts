import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Folder } from '../models/folder.model';
import { Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class FolderService {
  private apiUrl = 'http://localhost:3000/folders';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getUserId(): string {
    return String(this.authService.getCurrentUser()?.id ?? '');
  }

  getFolders(): Observable<Folder[]> {
    return this.http.get<Folder[]>(this.apiUrl).pipe(
      map(folders => folders.filter(f => String(f.userId) === this.getUserId()))
    );
  }

  folderChanged$ = new Subject<void>();

  createFolder(folder: Folder): Observable<Folder> {
    return this.http.post<Folder>(this.apiUrl, folder).pipe(tap(() => this.folderChanged$.next()));
  }

  deleteFolder(id: string | number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => this.folderChanged$.next()));
  }

  updateFolder(id: string | number, folder: Partial<Folder>): Observable<Folder> {
    return this.http.patch<Folder>(`${this.apiUrl}/${id}`, folder);
  }
}
