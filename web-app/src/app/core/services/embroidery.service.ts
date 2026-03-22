import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Embroidery {
  id: number;
  name: string;
  description: string;
  embroidery_picture: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class EmbroideryService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  private getAuthHeaders(): { [key: string]: string } {
    const user = this.authService.getStoredUser();
    if (user && user.token) {
      return { Authorization: `Bearer ${user.token}` };
    }
    return {};
  }

  private getMultipartAuthHeaders(): { [key: string]: string } {
    const user = this.authService.getStoredUser();
    if (user && user.token) {
      return { Authorization: `Bearer ${user.token}` };
    }
    return {};
  }

  getEmbroideries(): Observable<{
    success: boolean;
    results: Embroidery[];
    message: string;
  }> {
    return this.http.get<{
      success: boolean;
      results: Embroidery[];
      message: string;
    }>(`${this.apiUrl}embroideries`, { headers: this.getAuthHeaders() });
  }

  createEmbroidery(
    payload: { name: string; description: string },
    file: File
  ): Observable<{
    success: boolean;
    results: { embroidery: Embroidery };
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', payload.name);
    formData.append('description', payload.description);
    return this.http.post<{
      success: boolean;
      results: { embroidery: Embroidery };
      message: string;
    }>(`${this.apiUrl}embroideries`, formData, {
      headers: this.getMultipartAuthHeaders(),
    });
  }

  updateEmbroideryPicture(
    embroidery: Embroidery,
    file: File
  ): Observable<{
    success: boolean;
    results: { embroidery: Embroidery };
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{
      success: boolean;
      results: { embroidery: Embroidery };
      message: string;
    }>(`${this.apiUrl}embroideries/${embroidery.id}/update_embroidery_picture`, formData, {
      headers: this.getMultipartAuthHeaders(),
    });
  }
}
