import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Router } from '@angular/router';
import { User } from '../../models/user.model';
import { SidebarComponent } from '../sidebar/sidebar';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb';
import { FileListComponent } from '../file-list/file-list';
import { HistoryPanelComponent } from '../history-panel/history-panel';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, BreadcrumbComponent, FileListComponent, HistoryPanelComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent implements OnInit {
  currentUser: User | null = null;
  sidebarOpen = true;
  showHistoryPanel = false;
  selectedFolderId: string | number = 0;
  isMobile = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    this.sidebarOpen = !this.isMobile;
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleHistoryPanel(): void {
    this.showHistoryPanel = !this.showHistoryPanel;
  }

  onFolderSelected(folderId: string | number): void {
    this.selectedFolderId = folderId;
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
  }
}