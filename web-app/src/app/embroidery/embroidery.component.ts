import {
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmbroideryStore } from '../core/stores/embroidery.store';
import {
  EmbroideryService,
  Embroidery,
} from '../core/services/embroidery.service';

@Component({
  selector: 'app-embroidery',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './embroidery.component.html',
  styleUrl: './embroidery.component.scss',
})
export class EmbroideryComponent implements OnInit {
  @ViewChild('addDialogTpl') addDialogTpl!: TemplateRef<unknown>;
  @ViewChild('editDialogTpl') editDialogTpl!: TemplateRef<unknown>;
  @ViewChild('deleteDialogTpl') deleteDialogTpl!: TemplateRef<unknown>;

  dialogRef: MatDialogRef<unknown> | null = null;
  editDialogRef: MatDialogRef<unknown> | null = null;
  deleteDialogRef: MatDialogRef<unknown> | null = null;

  private embroideryStore = inject(EmbroideryStore);
  private embroideryService = inject(EmbroideryService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  embroidery = this.embroideryStore.embroidery;

  createForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required]],
  });

  editForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required]],
  });

  editingId = signal<number | null>(null);
  pendingDelete = signal<Embroidery | null>(null);

  selectedFile = signal<File | null>(null);
  editSelectedFile = signal<File | null>(null);

  isSubmitting = signal(false);
  isEditSubmitting = signal(false);
  isDeleteSubmitting = signal(false);
  createError = signal<string | null>(null);
  editError = signal<string | null>(null);

  isAiGenerating = signal(false);
  aiPreviewUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.loadEmbroideries();
  }

  loadEmbroideries(): void {
    this.embroideryStore.loadEmbroideries();
  }

  openAddDialog(): void {
    this.createError.set(null);
    this.selectedFile.set(null);
    this.aiPreviewUrl.set(null);
    this.isAiGenerating.set(false);
    this.createForm.reset();
    this.dialogRef = this.dialog.open(this.addDialogTpl, { width: '680px' });
  }

  openEditDialog(item: Embroidery): void {
    this.editError.set(null);
    this.editSelectedFile.set(null);
    this.editingId.set(item.id);
    this.editForm.patchValue({
      name: item.name,
      description: item.description,
    });
    this.editDialogRef = this.dialog.open(this.editDialogTpl, { width: '680px' });
  }

  openDeleteDialog(item: Embroidery): void {
    this.pendingDelete.set(item);
    this.deleteDialogRef = this.dialog.open(this.deleteDialogTpl, {
      width: '420px',
    });
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.createError.set(null);
    if (file) {
      this.aiPreviewUrl.set(null);
    }
  }

  generateAiTemplate(): void {
    const name = this.createForm.get('name')?.value?.trim();
    const desc = this.createForm.get('description')?.value?.trim();
    if (!name || !desc) {
      this.createForm.markAllAsTouched();
      this.createError.set('Enter a name and description first.');
      return;
    }

    this.createError.set(null);
    this.isAiGenerating.set(true);

    this.embroideryService
      .generateTemplateImage({ title: name, description: desc })
      .subscribe({
        next: (res) => {
          const b64 = res.results.preview_base64;
          const url = res.results.image_url;
          if (url) {
            this.aiPreviewUrl.set(url);
          } else if (b64) {
            this.aiPreviewUrl.set(`data:image/png;base64,${b64}`);
          }
          if (b64) {
            this.selectedFile.set(
              this.base64ToPngFile(b64, 'ai-embroidery-template.png')
            );
          }
          this.isAiGenerating.set(false);
          this.snackBar.open(
            'AI template ready — review the preview, then save.',
            'Dismiss',
            { duration: 4000 }
          );
        },
        error: (err) => {
          this.isAiGenerating.set(false);
          const msg =
            err?.error?.message ??
            (typeof err?.error === 'string' ? err.error : null) ??
            'Could not generate template.';
          this.createError.set(msg);
        },
      });
  }

  private base64ToPngFile(base64: string, filename: string): File {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: 'image/png' });
  }

  onEditCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.editSelectedFile.set(file);
    this.editError.set(null);
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
          this.aiPreviewUrl.set(null);
          this.dialogRef?.close();
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

  submitEdit(): void {
    this.editError.set(null);
    const id = this.editingId();
    if (this.editForm.invalid || id == null) {
      this.editForm.markAllAsTouched();
      return;
    }

    const { name, description } = this.editForm.getRawValue();
    const file = this.editSelectedFile();
    this.isEditSubmitting.set(true);

    this.embroideryService
      .updateEmbroidery(
        id,
        { name: name!.trim(), description: description!.trim() },
        file ?? undefined
      )
      .subscribe({
        next: (response) => {
          this.embroideryStore.updateEmbroidery(response.results.embroidery);
          this.editForm.reset();
          this.editSelectedFile.set(null);
          this.editingId.set(null);
          this.editDialogRef?.close();
          this.isEditSubmitting.set(false);
          this.snackBar.open('Embroidery updated', 'Dismiss', { duration: 3000 });
        },
        error: (err) => {
          this.isEditSubmitting.set(false);
          const msg =
            err?.error?.message ??
            (typeof err?.error === 'string' ? err.error : null) ??
            'Could not update embroidery.';
          this.editError.set(msg);
        },
      });
  }

  confirmDelete(): void {
    const item = this.pendingDelete();
    if (!item) {
      return;
    }

    this.isDeleteSubmitting.set(true);

    this.embroideryService.deleteEmbroidery(item.id).subscribe({
      next: () => {
        this.embroideryStore.deleteEmbroidery(item.id);
        this.pendingDelete.set(null);
        this.deleteDialogRef?.close();
        this.isDeleteSubmitting.set(false);
        this.snackBar.open('Embroidery deleted', 'Dismiss', { duration: 3000 });
      },
      error: (err) => {
        this.isDeleteSubmitting.set(false);
        const msg =
          err?.error?.message ??
          (typeof err?.error === 'string' ? err.error : null) ??
          'Could not delete embroidery.';
        this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
      },
    });
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
    this.deleteDialogRef?.close();
  }
}
