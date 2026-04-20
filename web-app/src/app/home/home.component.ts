import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../core/stores/auth.store';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  EmbroideryService,
  Embroidery,
} from '../core/services/embroidery.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  authStore = inject(AuthStore);
  router = inject(Router);
  private embroideryService = inject(EmbroideryService);

  loading = signal(true);
  private embroideries = signal<Embroidery[]>([]);

  /** Most recently completed project (by completion log date), for hero display only. */
  recentComplete = computed(() => {
    const list = this.embroideries();
    const withLog = list.filter((e) => e.completion_log?.completed_at);
    if (withLog.length === 0) {
      return null;
    }
    return [...withLog].sort(
      (a, b) =>
        new Date(b.completion_log!.completed_at).getTime() -
        new Date(a.completion_log!.completed_at).getTime()
    )[0];
  });

  ngOnInit(): void {
    this.embroideryService.getEmbroideries().subscribe({
      next: (res) => {
        this.embroideries.set(res.results ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  displayShortDate(iso: string | undefined): string {
    if (!iso) {
      return '';
    }
    return iso.slice(0, 10);
  }

  logout(): void {
    this.authStore.logout();
    this.router.navigate(['/login']);
  }
}
