import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FolderService } from '../../services/folder.service';
import { Folder } from '../../models/folder.model';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements OnInit {
  @Input() selectedFolderId: string | number = 0;
  @Output() folderSelected = new EventEmitter<string | number>();

  folders: Folder[] = [];
  rootFolders: Folder[] = [];
  childMap: Record<string, Folder[]> = {};

  newFolderName = '';
  showNewFolderInput = false;
  isAdmin = false;

  showConfirmModal = false;
  confirmMessage = '';
  confirmAction: (() => void) | null = null;

  constructor(
    private folderService: FolderService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.loadFolders();

    this.folderService.folderChanged$.subscribe(() => {
      this.loadFolders();
    });
  }

  loadFolders(): void {
    this.folderService.getFolders().subscribe({
      next: (folders) => {
        this.folders = folders;
        this.buildTree();
        this.cdr.detectChanges();
      },
      error: () => console.error('Failed to load folders'),
    });
  }

  buildTree(): void {
    this.rootFolders = [...this.folders.filter((f) => f.parentId === null)];
    this.childMap = {};
    for (const folder of this.folders) {
      if (folder.parentId != null) {
        const key = String(folder.parentId);
        if (!this.childMap[key]) this.childMap[key] = [];
        this.childMap[key].push(folder);
      }
    }
    this.childMap = { ...this.childMap };
  }

  isSelected(id: string | number): boolean {
    return String(this.selectedFolderId) === String(id);
  }

  selectFolder(id: string | number): void {
    this.selectedFolderId = id;
    this.folderSelected.emit(String(id));
  }

  trackById(_: number, folder: Folder): string {
    return String(folder.id);
  }

  createFolder(): void {
    if (!this.newFolderName.trim()) return;
    const newId = String(Date.now());
    const folder: Partial<Folder> = {
      id: newId,
      name: this.newFolderName.trim(),
      parentId: this.selectedFolderId == 0 ? null : String(this.selectedFolderId),
      userId: String(this.authService.getCurrentUser()?.id ?? ''),
    };

    const newFolder = folder as Folder;
    this.folders = [...this.folders, newFolder];
    this.buildTree();
    this.cdr.detectChanges();

    this.folderService.createFolder(newFolder).subscribe({
      next: () => {
        this.newFolderName = '';
        this.showNewFolderInput = false;
        this.folderSelected.emit(newId);
        this.loadFolders();
      },
      error: () => {
        this.folders = this.folders.filter((f) => f.id !== newId);
        this.buildTree();
        this.cdr.detectChanges();
      },
    });
  }

  deleteFolder(id: string | number, event: Event): void {
    event.stopPropagation();
    this.openConfirm('Are you sure you want to delete this folder?', () => {
      
      this.folders = this.folders.filter((f) => String(f.id) !== String(id));
      this.buildTree();
      this.cdr.detectChanges();

      this.folderService.deleteFolder(id).subscribe({
        next: () => {
          if (String(this.selectedFolderId) === String(id)) {
            this.folderSelected.emit(0);
          }
        },
        error: () => this.loadFolders(), // rollback
      });
    });
  }

  openConfirm(message: string, action: () => void): void {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirmModal = true;
  }
}
