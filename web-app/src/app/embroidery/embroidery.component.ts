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
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  EmbroideryService,
  Embroidery,
  Material,
  Pattern,
  CompletionLogPayload,
} from '../core/services/embroidery.service';
import { formatHttpApiError } from '../core/utils/http-api-error';

/** Completion log controls: required date + rating when enabled. */
function applyCompletionValidators(form: FormGroup, enabled: boolean): void {
  const d = form.get('completion_completed_at');
  const r = form.get('completion_satisfaction_rating');
  if (enabled) {
    d?.setValidators([Validators.required]);
    r?.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(10),
    ]);
  } else {
    d?.clearValidators();
    r?.clearValidators();
  }
  d?.updateValueAndValidity({ emitEvent: false });
  r?.updateValueAndValidity({ emitEvent: false });
}

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
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
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
  loadListError = this.embroideryStore.loadError;

  createForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required]],
    pattern_id: [null as number | null],
    material_ids: [[] as number[]],
    completion_enabled: [false],
    completion_completed_at: [null as Date | null],
    completion_hours_spent: [''],
    completion_satisfaction_rating: [''],
    completion_notes: ['', [Validators.maxLength(5000)]],
  });

  editForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required]],
    pattern_id: [null as number | null],
    material_ids: [[] as number[]],
    completion_enabled: [false],
    completion_completed_at: [null as Date | null],
    completion_hours_spent: [''],
    completion_satisfaction_rating: [''],
    completion_notes: ['', [Validators.maxLength(5000)]],
  });

  materials = signal<Material[]>([]);
  patterns = signal<Pattern[]>([]);

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

  isEditAiGenerating = signal(false);
  editAiPreviewUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.loadMaterials();
    this.loadPatterns();
    this.loadEmbroideries();
  }

  private loadMaterials(): void {
    this.embroideryService.getMaterials().subscribe({
      next: (res) => this.materials.set(res.results),
      error: (err) => {
        console.error('Error loading materials:', err);
        this.snackBar.open(
          formatHttpApiError(
            err,
            'Could not load the materials list. Refresh the page or try again shortly.'
          ),
          'Dismiss',
          { duration: 7000, panelClass: ['error-snackbar', 'error-snackbar-multiline'] }
        );
      },
    });
  }

  private loadPatterns(): void {
    this.embroideryService.getPatterns().subscribe({
      next: (res) => this.patterns.set(res.results),
      error: (err) => {
        console.error('Error loading patterns:', err);
        this.snackBar.open(
          formatHttpApiError(
            err,
            'Could not load patterns. Refresh the page or try again shortly.'
          ),
          'Dismiss',
          { duration: 7000, panelClass: ['error-snackbar', 'error-snackbar-multiline'] }
        );
      },
    });
  }

  loadEmbroideries(): void {
    this.embroideryStore.loadEmbroideries();
  }

  retryLoadEmbroideries(): void {
    this.embroideryStore.loadEmbroideries();
  }

  dismissLoadListError(): void {
    this.embroideryStore.clearLoadError();
  }

  openAddDialog(): void {
    this.createError.set(null);
    this.selectedFile.set(null);
    this.aiPreviewUrl.set(null);
    this.isAiGenerating.set(false);
    this.createForm.reset({
      pattern_id: null,
      material_ids: [],
      completion_enabled: false,
      completion_completed_at: null,
      completion_hours_spent: '',
      completion_satisfaction_rating: '',
      completion_notes: '',
    });
    applyCompletionValidators(this.createForm, false);
    this.dialogRef = this.dialog.open(this.addDialogTpl, {
      width: '720px',
      maxWidth: '95vw',
    });
  }

  openEditDialog(item: Embroidery): void {
    this.editError.set(null);
    this.editSelectedFile.set(null);
    this.editAiPreviewUrl.set(null);
    this.isEditAiGenerating.set(false);
    this.editingId.set(item.id);
    const log = item.completion_log;
    this.editForm.patchValue({
      name: item.name,
      description: item.description,
      pattern_id: item.patterns?.length ? item.patterns[0].id : null,
      material_ids: item.materials?.map((m) => m.id) ?? [],
      completion_enabled: !!log,
      completion_completed_at: this.parseIsoToDate(log?.completed_at),
      completion_hours_spent:
        log?.hours_spent !== undefined && log?.hours_spent !== null
          ? String(log.hours_spent)
          : '',
      completion_satisfaction_rating:
        log?.satisfaction_rating != null ? String(log.satisfaction_rating) : '',
      completion_notes: log?.notes ?? '',
    });
    applyCompletionValidators(this.editForm, !!log);
    this.editDialogRef = this.dialog.open(this.editDialogTpl, {
      width: '720px',
      maxWidth: '95vw',
    });
  }

  onCompletionEnabledChange(enabled: boolean, form: FormGroup): void {
    applyCompletionValidators(form, enabled);
  }

  private parseIsoToDate(iso: string | undefined): Date | null {
    if (!iso) {
      return null;
    }
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /** Template: short date for completion log column. */
  displayShortDate(iso: string | undefined): string {
    if (!iso) {
      return '';
    }
    return iso.slice(0, 10);
  }

  /** Sets completion date to today (local) for calendar + API. */
  setCompletedDateToday(form: FormGroup): void {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    form.patchValue({ completion_completed_at: today });
    form.get('completion_completed_at')?.markAsTouched();
    form.get('completion_completed_at')?.updateValueAndValidity();
  }

  private dateToApiDateString(value: unknown): string {
    if (value == null || value === '') {
      return '';
    }
    const date =
      value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private completionPayloadFromForm(form: FormGroup): CompletionLogPayload {
    const enabled = !!form.get('completion_enabled')?.value;
    if (!enabled) {
      return { enabled: false };
    }
    return {
      enabled: true,
      completedAt: this.dateToApiDateString(
        form.get('completion_completed_at')?.value
      ),
      hoursSpent: (form.get('completion_hours_spent')?.value as string) || '',
      satisfactionRating:
        (form.get('completion_satisfaction_rating')?.value as string) || '',
      notes: (form.get('completion_notes')?.value as string) || '',
    };
  }

  openDeleteDialog(item: Embroidery): void {
    this.pendingDelete.set(item);
    this.deleteDialogRef = this.dialog.open(this.deleteDialogTpl, {
      width: '420px',
      maxWidth: '95vw',
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
          this.createError.set(
            formatHttpApiError(
              err,
              'Could not generate the AI template. Check your connection and try again.'
            )
          );
        },
      });
  }

  generateAiTemplateForEdit(): void {
    const name = this.editForm.get('name')?.value?.trim();
    const desc = this.editForm.get('description')?.value?.trim();
    if (!name || !desc) {
      this.editForm.markAllAsTouched();
      this.editError.set('Enter a name and description first.');
      return;
    }

    this.editError.set(null);
    this.isEditAiGenerating.set(true);

    this.embroideryService
      .generateTemplateImage({ title: name, description: desc })
      .subscribe({
        next: (res) => {
          const b64 = res.results.preview_base64;
          const url = res.results.image_url;
          if (url) {
            this.editAiPreviewUrl.set(url);
          } else if (b64) {
            this.editAiPreviewUrl.set(`data:image/png;base64,${b64}`);
          }
          if (b64) {
            this.editSelectedFile.set(
              this.base64ToPngFile(b64, 'ai-embroidery-template.png')
            );
          }
          this.isEditAiGenerating.set(false);
          this.snackBar.open(
            'AI template ready — it will replace the cover when you save (or pick another file below).',
            'Dismiss',
            { duration: 4500 }
          );
        },
        error: (err) => {
          this.isEditAiGenerating.set(false);
          this.editError.set(
            formatHttpApiError(
              err,
              'Could not generate the AI template. Check your connection and try again.'
            )
          );
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
    if (file) {
      this.editAiPreviewUrl.set(null);
    }
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

    const { name, description, material_ids, pattern_id } =
      this.createForm.getRawValue();
    const mids = (material_ids as number[] | undefined) ?? [];
    const patternId =
      pattern_id != null && Number(pattern_id) > 0
        ? Number(pattern_id)
        : null;
    const completion = this.completionPayloadFromForm(this.createForm);
    this.isSubmitting.set(true);

    this.embroideryService
      .createEmbroidery(
        {
          name: name!.trim(),
          description: description!.trim(),
          completion,
        },
        file,
        mids,
        patternId
      )
      .subscribe({
        next: (response) => {
          this.embroideryStore.addEmbroidery(response.results.embroidery);
          this.createForm.reset({
            pattern_id: null,
            material_ids: [],
            completion_enabled: false,
            completion_completed_at: null,
            completion_hours_spent: '',
            completion_satisfaction_rating: '',
            completion_notes: '',
          });
          applyCompletionValidators(this.createForm, false);
          this.selectedFile.set(null);
          this.aiPreviewUrl.set(null);
          this.dialogRef?.close();
          this.isSubmitting.set(false);
          this.snackBar.open('Embroidery added', 'Dismiss', { duration: 3000 });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.createError.set(
            formatHttpApiError(
              err,
              'Could not save this embroidery. Fix the issues below and try again.'
            )
          );
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

    const { name, description, material_ids, pattern_id } =
      this.editForm.getRawValue();
    const mids = (material_ids as number[] | undefined) ?? [];
    const patternId =
      pattern_id != null && Number(pattern_id) > 0
        ? Number(pattern_id)
        : null;
    const file = this.editSelectedFile();
    const completion = this.completionPayloadFromForm(this.editForm);
    this.isEditSubmitting.set(true);

    this.embroideryService
      .updateEmbroidery(
        id,
        {
          name: name!.trim(),
          description: description!.trim(),
          completion,
        },
        file ?? undefined,
        mids,
        patternId
      )
      .subscribe({
        next: (response) => {
          this.embroideryStore.updateEmbroidery(response.results.embroidery);
          this.editForm.reset({
            pattern_id: null,
            material_ids: [],
            completion_enabled: false,
            completion_completed_at: null,
            completion_hours_spent: '',
            completion_satisfaction_rating: '',
            completion_notes: '',
          });
          applyCompletionValidators(this.editForm, false);
          this.editSelectedFile.set(null);
          this.editAiPreviewUrl.set(null);
          this.editingId.set(null);
          this.editDialogRef?.close();
          this.isEditSubmitting.set(false);
          this.snackBar.open('Embroidery updated', 'Dismiss', { duration: 3000 });
        },
        error: (err) => {
          this.isEditSubmitting.set(false);
          this.editError.set(
            formatHttpApiError(
              err,
              'Could not update this embroidery. Fix the issues below and try again.'
            )
          );
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
        this.snackBar.open(
          formatHttpApiError(
            err,
            'Could not delete this embroidery. Try again or refresh the page.'
          ),
          'Dismiss',
          {
            duration: 9000,
            panelClass: ['error-snackbar', 'error-snackbar-multiline'],
          }
        );
      },
    });
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
    this.deleteDialogRef?.close();
  }
}
