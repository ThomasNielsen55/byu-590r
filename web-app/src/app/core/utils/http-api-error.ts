import { HttpErrorResponse } from '@angular/common/http';

function messageForHttpStatus(status: number, fallback: string): string {
  if (status === 0) {
    return 'Network error — check your connection and try again.';
  }
  if (status === 413) {
    return 'This file is too large for the server. Try a smaller image.';
  }
  if (status === 401 || status === 403) {
    return 'Your session may have expired. Sign in again and retry.';
  }
  if (status === 503) {
    return 'Service is temporarily unavailable. Try again in a moment.';
  }
  if (status >= 500) {
    return 'Something went wrong on the server. Try again in a moment.';
  }
  return fallback;
}

/**
 * Turns Laravel/BaseController JSON errors into a readable multi-line string for UI.
 * Expects: `{ success: false, message: string, data?: Record<string, string[]> }`.
 */
export function formatHttpApiError(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const inner = error.error;
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const parsed = formatHttpApiErrorBody(inner, '');
      if (parsed !== '') {
        return parsed;
      }
    }
    if (typeof inner === 'string' && inner.trim().length > 0) {
      return inner.trim();
    }
    return messageForHttpStatus(error.status, fallback);
  }

  return formatHttpApiErrorBody(error, fallback);
}

function formatHttpApiErrorBody(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const body = error as {
      message?: string;
      data?: Record<string, string[] | string>;
    };

    const data = body.data;
    const rawMsg = typeof body.message === 'string' ? body.message.trim() : '';

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const bullets: string[] = [];
      for (const msgs of Object.values(data)) {
        const arr = Array.isArray(msgs) ? msgs : [String(msgs)];
        for (const line of arr) {
          const t = String(line).trim();
          if (t && !bullets.includes(t)) {
            bullets.push(t);
          }
        }
      }
      if (bullets.length > 0) {
        const isGenericValidation =
          /^validation error\.?$/i.test(rawMsg) ||
          /^please correct the fields below\.?$/i.test(rawMsg) ||
          rawMsg === '';
        const intro = isGenericValidation
          ? 'Please fix the following and try again:'
          : rawMsg;
        return intro + '\n\n• ' + bullets.join('\n• ');
      }
    }

    if (rawMsg.length > 0) {
      return rawMsg;
    }
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  return fallback;
}
