import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/users';
  private currentUser: User | null = null;

  constructor(private http: HttpClient) {}

login(username: string, password: string): Observable<User | null> {
  return this.http.get<User[]>(this.apiUrl).pipe(
    map(users => {
      const user = users.find(
        u => u.username === username && u.password === password
      );
      if (user) {
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
      }
      return null;
    })
  );
}

  register(name: string, username: string, password: string): Observable<User | null> {
    return this.http.get<User[]>(`${this.apiUrl}?username=${username}`).pipe(
      switchMap(existing => {
        if (existing.length > 0) {
          throw new Error('USERNAME_EXISTS');
        }
        const newUser = {
          id: String(Date.now()),
          name,
          username,
          password,
          role: 'user'
        };
        return this.http.post<User>(this.apiUrl, newUser);
      }),
      map(user => {
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
      })
    );
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem('currentUser');
      if (stored) this.currentUser = JSON.parse(stored);
    }
    return this.currentUser;
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  isAdmin(): boolean {
    return this.getCurrentUser()?.role === 'admin';
  }
}