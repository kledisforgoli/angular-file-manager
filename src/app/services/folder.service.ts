import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Folder } from '../models/folder.model';
import { Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FolderService {
  private apiUrl = 'http://localhost:3000/folders';

  constructor(private http: HttpClient) {}

  getFolders(): Observable<Folder[]> {
    return this.http.get<Folder[]>(this.apiUrl);
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
