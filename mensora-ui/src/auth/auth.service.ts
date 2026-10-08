import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';

export interface User {
  id: number;
  email: string;
  username: string;
  preferred_language: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedInSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  loggedIn$ = this.loggedInSubject.asObservable();
  currentUser$ = this.currentUserSubject.asObservable();

  private API_SERVER = 'http://localhost:3001';

  constructor(private http: HttpClient) {}

    login(email: string, password: string): Observable<User> {
        return this.http.post<{ success: boolean; user?: any }>(
            `${this.API_SERVER}/auth/login`,
            { user_email: email, user_password: password },
            { withCredentials: true }
        ).pipe(
            map(res => {
            if (res.success && res.user) {
                const user: User = {
                id: res.user.id,
                email: res.user.email,
                username: res.user.user,
                preferred_language: res.user.preferred_language,
                };
                this.setUser(user);
                return user;
            }
            throw new Error('Por favor, verifique as suas credenciais');
            })
        );
    }

    logout(): Observable<void> {
        return this.http.post<void>(
        `${this.API_SERVER}/auth/logout`,
        {},
        { withCredentials: true }
        ).pipe(
        tap(() => this.clearUser())
        );
    }

    checkLogin(): Observable<User | null> {
        return this.http.get<{ loggedIn: boolean; user?: any }>(
            `${this.API_SERVER}/auth/me`,
            { withCredentials: true }
        ).pipe(
            map(res => {
            if (res.loggedIn && res.user) {
                const user: User = {
                id: res.user.id,
                email: res.user.email,
                username: res.user.username,
                preferred_language: res.user.preferred_language,
                };
                this.setUser(user);
                return user;
            } else {
                this.clearUser();
                return null;
            }
            })
        );
    }

    private setUser(user: User) {
        this.currentUserSubject.next(user);
        this.loggedInSubject.next(true);
    }

    private clearUser() {
        this.currentUserSubject.next(null);
        this.loggedInSubject.next(false);
    }
}
