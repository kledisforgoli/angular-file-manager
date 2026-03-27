import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';
  errorField: 'username' | 'password' | 'both' | null = null;
  loading = false;
  submitted = false;
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public themeService: ThemeService
  ) {}

  onLogin(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.errorField = null;

    if (!this.username) {
      this.errorField = 'username';
      return;
    }
    if (!this.password) {
      this.errorField = 'password';
      return;
    }

    this.loading = true;

    this.authService.login(this.username, this.password).subscribe({
      next: (user) => {
        this.loading = false;
        if (user) {
          const target = user.role === 'admin' ? '/admin' : '/';
          this.router.navigate([target], { replaceUrl: true });
        } else {
          this.errorField = 'both';
          this.errorMessage = 'Invalid username or password.';
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Server error. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}