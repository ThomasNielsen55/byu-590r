import {
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AuthStore } from '../../core/stores/auth.store';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  @ViewChild('loginPasswordInput')
  private loginPasswordInput?: ElementRef<HTMLInputElement>;

  @ViewChild('registerLastNameInput')
  private registerLastNameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('registerEmailInput')
  private registerEmailInput?: ElementRef<HTMLInputElement>;
  @ViewChild('registerPasswordInput')
  private registerPasswordInput?: ElementRef<HTMLInputElement>;
  @ViewChild('registerPasswordConfirmInput')
  private registerPasswordConfirmInput?: ElementRef<HTMLInputElement>;

  private authService = inject(AuthService);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  loginForm: FormGroup;
  registerForm: FormGroup;
  forgotPasswordForm: FormGroup;

  /** Current card view: login form, forgot password, or register */
  view = signal<'login' | 'forgot-password' | 'register'>('login');

  isLoading = signal(false);
  errorMsg = signal('');
  submitForgotPasswordLoading = signal(false);
  registerFormIsLoading = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: [
        '',
        [Validators.required, Validators.minLength(3), Validators.email],
      ],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });

    this.registerForm = this.fb.group(
      {
        first_name: ['', [Validators.required, Validators.minLength(1)]],
        last_name: ['', [Validators.required, Validators.minLength(1)]],
        email: [
          '',
          [Validators.required, Validators.minLength(3), Validators.email],
        ],
        password: ['', [Validators.required, Validators.minLength(8)]],
        password_confirm: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );

    this.forgotPasswordForm = this.fb.group({
      email: [
        '',
        [Validators.required, Validators.minLength(3), Validators.email],
      ],
    });
  }

  /** Enter on email moves to password instead of submitting an incomplete form. */
  onLoginEmailEnter(event: Event): void {
    event.preventDefault();
    this.loginPasswordInput?.nativeElement.focus();
  }

  onRegisterFieldEnter(
    event: Event,
    next:
      | 'last_name'
      | 'email'
      | 'password'
      | 'password_confirm'
      | 'submit'
  ): void {
    event.preventDefault();
    switch (next) {
      case 'last_name':
        this.registerLastNameInput?.nativeElement.focus();
        break;
      case 'email':
        this.registerEmailInput?.nativeElement.focus();
        break;
      case 'password':
        this.registerPasswordInput?.nativeElement.focus();
        break;
      case 'password_confirm':
        this.registerPasswordConfirmInput?.nativeElement.focus();
        break;
      case 'submit':
        this.submitRegister();
        break;
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const cPassword = form.get('password_confirm');
    if (!password || !cPassword) return null;
    if (password.value !== cPassword.value) {
      cPassword.setErrors({ ...cPassword.errors, passwordMismatch: true });
      return { passwordMismatch: true };
    }
    const err = { ...cPassword.errors };
    delete (err as Record<string, unknown>)['passwordMismatch'];
    cPassword.setErrors(Object.keys(err).length ? err : null);
    return null;
  }

  submitLogin(): void {
    if (!this.loginForm.valid) {
      return;
    }

    this.errorMsg.set('');
    this.isLoading.set(true);

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        if (response.results.token) {
          this.authStore.login(response.results);
          this.snackBar.open('Login successful!', 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          });
          this.router.navigate(['/home']);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('Login Failed! Can not Authenticate!');
        this.isLoading.set(false);
      },
    });
  }

  submitForgotPassword(): void {
    if (!this.forgotPasswordForm.valid) {
      return;
    }

    this.submitForgotPasswordLoading.set(true);
    this.authService
      .forgotPassword(this.forgotPasswordForm.value.email)
      .subscribe({
        next: () => {
          this.snackBar.open(
            'Success! Check your email for password reset instructions.',
            'Close',
            {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
            },
          );
          this.submitForgotPasswordLoading.set(false);
          this.view.set('login');
        },
        error: () => {
          this.submitForgotPasswordLoading.set(false);
        },
      });
  }

  submitRegister(): void {
    if (!this.registerForm.valid) {
      return;
    }

    this.registerFormIsLoading.set(true);
    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.snackBar.open('Registration complete. You can now log in.', 'Close', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
        this.registerFormIsLoading.set(false);
        this.view.set('login');
      },
      error: () => {
        this.snackBar.open('Registration failed. Please try again.', 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        });
        this.registerFormIsLoading.set(false);
      },
    });
  }
}
