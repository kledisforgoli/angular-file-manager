import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, map } from 'rxjs';
import { File } from '../models/file.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private apiUrl = 'http://localhost:3000/files';

  fileChanged$ = new Subject<{ movedIds: string[]; newFolderId: string | null }>();

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getUserId(): string {
    return String(this.authService.getCurrentUser()?.id ?? '');
  }

  getFiles(): Observable<File[]> {
    return this.http.get<File[]>(this.apiUrl).pipe(
      map(files => files.filter(f => String(f.userId) === this.getUserId()))
    );
  }

  getFilesByFolder(folderId: number): Observable<File[]> {
    return this.http.get<File[]>(`${this.apiUrl}?folderId=${folderId}`).pipe(
      map(files => files.filter(f => String(f.userId) === this.getUserId()))
    );
  }

  uploadFile(file: Omit<File, 'id'>): Observable<File> {
    return this.http.post<File>(this.apiUrl, file);
  }

updateFile(id: string | number, file: Partial<File>): Observable<File> {
  return this.http.patch<File>(`${this.apiUrl}/${id}`, file);
}

deleteFile(id: string | number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/${id}`);
}
}