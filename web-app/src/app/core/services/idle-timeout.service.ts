import { Injectable, inject, effect, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../stores/auth.store';
import { environment } from '../../../environments/environment';

const DEFAULT_IDLE_MINUTES = 15;
const CHECK_INTERVAL_MS = 10_000;

/**
 * Logs the user out after a period with no pointer, key, scroll, or click activity.
 * Configure via `environment.idleLogoutMinutes` (0 = disabled).
 */
@Injectable({ providedIn: 'root' })
export class IdleTimeoutService {
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private zone = inject(NgZone);

  private readonly idleMinutes =
    'idleLogoutMinutes' in environment &&
    typeof (environment as { idleLogoutMinutes?: number }).idleLogoutMinutes ===
      'number'
      ? (environment as { idleLogoutMinutes: number }).idleLogoutMinutes
      : DEFAULT_IDLE_MINUTES;

  private readonly idleMs = this.idleMinutes * 60 * 1000;
  private readonly disabled = this.idleMinutes <= 0;

  private lastActivity = Date.now();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private readonly bump = (): void => {
    this.lastActivity = Date.now();
  };

  private readonly events = [
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
    'click',
  ] as const;

  constructor() {
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  private start(): void {
    this.stop();
    if (this.disabled) {
      return;
    }

    this.lastActivity = Date.now();

    this.zone.runOutsideAngular(() => {
      for (const ev of this.events) {
        document.addEventListener(ev, this.bump, { passive: true, capture: true });
      }
      this.intervalId = setInterval(() => {
        if (Date.now() - this.lastActivity > this.idleMs) {
          this.zone.run(() => this.logoutAfterIdle());
        }
      }, CHECK_INTERVAL_MS);
    });
  }

  private stop(): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    for (const ev of this.events) {
      document.removeEventListener(ev, this.bump, { capture: true });
    }
  }

  private logoutAfterIdle(): void {
    if (!this.authStore.isAuthenticated()) {
      return;
    }
    this.stop();
    this.snackBar.open('You were logged out due to inactivity.', 'Dismiss', {
      duration: 6000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
    this.authStore.logout();
    this.router.navigate(['/login']);
  }
}
