import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Material {
  id: number;
  name: string;
  kind?: string | null;
  dmc_number?: string | null;
  brand?: string | null;
}

/** Catalog row for single-select (many-to-many limited to one link from UI). */
export interface Pattern {
  id: number;
  name: string;
  source?: string | null;
  skill_level?: string | null;
}

/** 1:1 completion log (optional on the embroidery). */
export interface CompletionLog {
  id: number;
  embroidery_id: number;
  completed_at: string;
  hours_spent: string | number | null;
  satisfaction_rating: number;
  notes: string | null;
}

export interface Embroidery {
  id: number;
  name: string;
  description: string;
  embroidery_picture: string | null;
  materials?: Material[];
  patterns?: Pattern[];
  completion_log?: CompletionLog | null;
}

/** Sent as multipart fields for create/update embroidery. */
export interface CompletionLogPayload {
  enabled: boolean;
  completedAt?: string;
  hoursSpent?: string;
  satisfactionRating?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmbroideryService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  private getAuthHeaders(): Record<string, string> {
    const user = this.authService.getStoredUser();
    if (user && user.token) {
      return { Authorization: `Bearer ${user.token}` };
    }
    return {};
  }

  private getMultipartAuthHeaders(): Record<string, string> {
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

  getMaterials(): Observable<{
    success: boolean;
    results: Material[];
    message: string;
  }> {
    return this.http.get<{
      success: boolean;
      results: Material[];
      message: string;
    }>(`${this.apiUrl}materials`, { headers: this.getAuthHeaders() });
  }

  getPatterns(): Observable<{
    success: boolean;
    results: Pattern[];
    message: string;
  }> {
    return this.http.get<{
      success: boolean;
      results: Pattern[];
      message: string;
    }>(`${this.apiUrl}patterns`, { headers: this.getAuthHeaders() });
  }

  createEmbroidery(
    payload: {
      name: string;
      description: string;
      completion?: CompletionLogPayload;
    },
    file: File,
    materialIds: number[] = [],
    patternId: number | null = null
  ): Observable<{
    success: boolean;
    results: { embroidery: Embroidery };
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', payload.name);
    formData.append('description', payload.description);
    this.appendCompletionFields(formData, payload.completion);
    if (patternId != null && patternId > 0) {
      formData.append('pattern_id', String(patternId));
    }
    for (const id of materialIds) {
      formData.append('material_ids[]', String(id));
    }
    return this.http.post<{
      success: boolean;
      results: { embroidery: Embroidery };
      message: string;
    }>(`${this.apiUrl}embroideries`, formData, {
      headers: this.getMultipartAuthHeaders(),
    });
  }

  /**
   * Updates name/description and optionally replaces the cover image (multipart POST).
   */
  updateEmbroidery(
    id: number,
    payload: {
      name: string;
      description: string;
      completion?: CompletionLogPayload;
    },
    file?: File | null,
    materialIds: number[] = [],
    patternId: number | null = null
  ): Observable<{
    success: boolean;
    results: { embroidery: Embroidery };
    message: string;
  }> {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('description', payload.description);
    this.appendCompletionFields(formData, payload.completion);
    if (file) {
      formData.append('file', file);
    }
    if (patternId != null && patternId > 0) {
      formData.append('pattern_id', String(patternId));
    }
    for (const mid of materialIds) {
      formData.append('material_ids[]', String(mid));
    }
    return this.http.post<{
      success: boolean;
      results: { embroidery: Embroidery };
      message: string;
    }>(`${this.apiUrl}embroideries/${id}`, formData, {
      headers: this.getMultipartAuthHeaders(),
    });
  }

  /**
   * OpenAI DALL·E: generates a template image from title + description, stores on S3, returns URL + base64.
   */
  generateTemplateImage(payload: {
    title: string;
    description: string;
  }): Observable<{
    success: boolean;
    results: {
      image_url: string | null;
      preview_base64: string;
    };
    message: string;
  }> {
    return this.http.post<{
      success: boolean;
      results: {
        image_url: string | null;
        preview_base64: string;
      };
      message: string;
    }>(`${this.apiUrl}embroideries/generate-template`, payload, {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
  }

  deleteEmbroidery(id: number): Observable<{
    success: boolean;
    results: { id: number };
    message: string;
  }> {
    return this.http.delete<{
      success: boolean;
      results: { id: number };
      message: string;
    }>(`${this.apiUrl}embroideries/${id}`, { headers: this.getAuthHeaders() });
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

  private appendCompletionFields(
    formData: FormData,
    completion: CompletionLogPayload | undefined
  ): void {
    const enabled = completion?.enabled === true;
    formData.append('completion_enabled', enabled ? '1' : '0');
    if (!enabled) {
      return;
    }
    if (completion?.completedAt) {
      formData.append('completion_completed_at', completion.completedAt);
    }
    if (
      completion?.satisfactionRating !== undefined &&
      completion.satisfactionRating !== ''
    ) {
      formData.append(
        'completion_satisfaction_rating',
        String(completion.satisfactionRating)
      );
    }
    if (completion?.hoursSpent !== undefined && completion.hoursSpent !== '') {
      formData.append('completion_hours_spent', String(completion.hoursSpent));
    }
    if (completion?.notes) {
      formData.append('completion_notes', completion.notes);
    }
  }
}
