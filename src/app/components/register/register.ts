import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  name = '';
  username = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get nameError(): string {
    if (!this.name) return '';
    if (this.name.trim().length < 2) return 'Name must be at least 2 characters.';
    return '';
  }

  get usernameError(): string {
    if (!this.username) return '';
    if (this.username.length < 3) return 'Username must be at least 3 characters.';
    if (!/^[a-zA-Z0-9_]+$/.test(this.username)) return 'Username can only contain letters, numbers, and underscores.';
    return '';
  }

  get passwordError(): string {
    if (!this.password) return '';
    if (this.password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  }

  get confirmPasswordError(): string {
    if (!this.confirmPassword) return '';
    if (this.confirmPassword !== this.password) return 'Passwords do not match.';
    return '';
  }

  get isFormValid(): boolean {
    return (
      this.name.trim().length >= 2 &&
      this.username.length >= 3 &&
      /^[a-zA-Z0-9_]+$/.test(this.username) &&
      this.password.length >= 6 &&
      this.password === this.confirmPassword
    );
  }

  onRegister(): void {
    if (!this.isFormValid) {
      this.errorMessage = 'Please fix all errors before submitting.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.register(this.name.trim(), this.username, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.authService.logout();
        this.successMessage = 'Account created successfully! Redirecting to login...';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        if (err.message === 'USERNAME_EXISTS') {
          this.errorMessage = 'Username already exists. Please choose another.';
        } else {
          this.errorMessage = 'Server error. Please try again.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}