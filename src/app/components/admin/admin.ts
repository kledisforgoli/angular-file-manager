import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class AdminComponent implements OnInit {
  users: User[] = [];

  showAddModal = false;
  newUser = { name: '', username: '', password: '', role: 'user' };
  addError = '';

  showConfirmModal = false;
  confirmMessage = '';
  confirmAction: (() => void) | null = null;

  toast: { message: string; type: string } | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  currentUserId: string | number = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?.id ?? '';
    this.loadUsers();
  }

  loadUsers(): void {
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.cdr.detectChanges();
      },
    });
  }

  openAddModal(): void {
    this.newUser = { name: '', username: '', password: '', role: 'user' };
    this.addError = '';
    this.showAddModal = true;
  }

  addUser(): void {
    if (!this.newUser.name.trim() || !this.newUser.username.trim() || !this.newUser.password.trim()) {
      this.addError = 'All fields are required.';
      return;
    }
    if (this.newUser.username.trim().length < 3) {
      this.addError = 'Username must be at least 3 characters.';
      return;
    }
    if (this.newUser.password.trim().length < 6) {
      this.addError = 'Password must be at least 6 characters.';
      return;
    }

    this.addError = '';
    this.authService.addUser(this.newUser).subscribe({
      next: (user) => {
        this.users = [...this.users, user];
        this.showAddModal = false;
        this.cdr.detectChanges();
        this.showToast('User added successfully!', 'success');
      },
      error: (err) => {
        if (err.message === 'USERNAME_EXISTS') {
          this.addError = 'Username already exists.';
        } else {
          this.addError = 'Failed to add user.';
        }
      },
    });
  }

  deleteUser(user: User): void {
    if (String(user.id) === String(this.currentUserId)) return;
    this.openConfirm(`Delete user "${user.name}" (@${user.username})?`, () => {
      this.users = this.users.filter((u) => String(u.id) !== String(user.id));
      this.cdr.detectChanges();
      this.authService.deleteUser(user.id).subscribe({
        next: () => {
          this.showToast('User deleted.', 'warning');
        },
        error: () => {
          this.loadUsers();
          this.showToast('Failed to delete user.', 'warning');
        },
      });
    });
  }

  openConfirm(message: string, action: () => void): void {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirmModal = true;
  }

  showToast(message: string, type: string): void {
    this.toast = { message, type };
    this.cdr.detectChanges();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toast = null;
      this.cdr.detectChanges();
    }, 5000);
  }

  isCurrentUser(user: User): boolean {
    return String(user.id) === String(this.currentUserId);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
