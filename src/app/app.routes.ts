import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./components/admin/admin').then(m => m.AdminComponent),
    canActivate: [adminGuard]
  },
  {
    path: '',
    loadComponent: () =>
      import('./components/layout/layout').then(m => m.LayoutComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];