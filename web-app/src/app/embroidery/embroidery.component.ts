import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EmbroideryStore } from '../core/stores/embroidery.store';
import { EmbroideryService } from '../core/services/embroidery.service';

@Component({
  selector: 'app-embroidery',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: './embroidery.component.html',
  styleUrl: './embroidery.component.scss',
})
export class EmbroideryComponent implements OnInit {
  private embroideryStore = inject(EmbroideryStore);
  private embroideryService = inject(EmbroideryService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  embroideries = this.embroideryStore.embroideries;

  createForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required]],
  });

  selectedFile = signal<File | null>(null);
  isSubmitting = signal(false);
  createError = signal<string | null>(null);

  ngOnInit(): void {
    this.embroideryStore.loadEmbroideries();
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.createError.set(null);
  }

  submitCreate(): void {
    this.createError.set(null);
    const file = this.selectedFile();
    if (this.createForm.invalid || !file) {
      this.createForm.markAllAsTouched();
      if (!file) {
        this.createError.set('Choose a cover image.');
      }
      return;
    }

    const { name, description } = this.createForm.getRawValue();
    this.isSubmitting.set(true);

    this.embroideryService
      .createEmbroidery(
        { name: name!.trim(), description: description!.trim() },
        file
      )
      .subscribe({
        next: (response) => {
          this.embroideryStore.addEmbroidery(response.results.embroidery);
          this.createForm.reset();
          this.selectedFile.set(null);
          this.isSubmitting.set(false);
          this.snackBar.open('Embroidery added', 'Dismiss', { duration: 3000 });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg =
            err?.error?.message ??
            (typeof err?.error === 'string' ? err.error : null) ??
            'Could not save embroidery.';
          this.createError.set(msg);
        },
      });
  }
}
