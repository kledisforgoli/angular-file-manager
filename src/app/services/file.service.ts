import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { File } from '../models/file.model';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private apiUrl = 'http://localhost:3000/files';

  constructor(private http: HttpClient) {}

  getFiles(): Observable<File[]> {
    return this.http.get<File[]>(this.apiUrl);
  }

  getFilesByFolder(folderId: number): Observable<File[]> {
    return this.http.get<File[]>(`${this.apiUrl}?folderId=${folderId}`);
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