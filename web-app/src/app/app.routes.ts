import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'books',
    loadComponent: () =>
      import('./books/books.component').then((m) => m.BooksComponent),
    canActivate: [authGuard],
  },
  {
    path: 'embroidery',
    loadComponent: () =>
      import('./embroidery/embroidery.component').then(
        (m) => m.EmbroideryComponent
      ),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/login' },
];
