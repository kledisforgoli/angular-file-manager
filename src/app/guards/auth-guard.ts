import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.isAdmin()) {
    router.navigate(['/admin'], { replaceUrl: true });
    return false;
  }

  return true;
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true;
  }

  const target = authService.isAdmin() ? '/admin' : '/';
  router.navigate([target], { replaceUrl: true });
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }

  router.navigate(['/']);
  return false;
};