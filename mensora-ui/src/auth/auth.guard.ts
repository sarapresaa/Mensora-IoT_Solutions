import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable, map, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

    canActivate(): Observable<boolean> {
        return this.authService.checkLogin().pipe(
            map(user => !!user),
            tap(loggedIn => {
            if (!loggedIn) this.router.navigate(['/login']);
            })
        );
    }
}
