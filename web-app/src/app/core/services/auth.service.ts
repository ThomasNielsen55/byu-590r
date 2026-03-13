import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface AuthResponse {
  token: string;
  name: string;
  avatar?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  login(user: LoginRequest): Observable<{ success: boolean; results: AuthResponse; message: string }> {
    const formData = new FormData();
    formData.append('email', user.email);
    formData.append('password', user.password);
    return this.http.post<{ success: boolean; results: AuthResponse; message: string }>(
      `${this.apiUrl}login`,
      formData
    );
  }

  /** Calls POST /api/logout with bearer token, then clears user from localStorage. */
  logout(): Observable<unknown> {
    const user = this.getStoredUser();
    const token = user?.token;
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    return this.http
      .post<unknown>(`${this.apiUrl}logout`, {}, { headers })
      .pipe(tap(() => this.clearUser()));
  }

  clearUser(): void {
    localStorage.removeItem('user');
  }

  register(user: RegisterRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}register`, user);
  }

  forgotPassword(email: string): Observable<any> {
    const formData = new FormData();
    formData.append('email', email);
    return this.http.post(`${this.apiUrl}forgot_password`, formData);
  }

  getStoredUser(): AuthResponse | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  }

  storeUser(user: AuthResponse): void {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

