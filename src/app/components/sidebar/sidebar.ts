import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FolderService } from '../../services/folder.service';
import { FileService } from '../../services/file.service';
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

  toast: { message: string; type: string } | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  dragOverFolderId: string | number | null = null;

  constructor(
    private folderService: FolderService,
    private fileService: FileService,
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
        this.showToast('Folder created!', 'success');
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
          this.showToast('Folder deleted.', 'warning');
        },
        error: () => this.loadFolders(), // rollback
      });
    });
  }

  showToast(message: string, type: string): void {
    this.toast = { message, type };
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toast = null;
      this.cdr.detectChanges();
    }, 5000);
  }

  onDragStart(event: DragEvent, id: string | number): void {
    event.dataTransfer?.setData('application/json', JSON.stringify({ id: String(id), type: 'folder' }));
    event.dataTransfer!.effectAllowed = 'move';
    event.stopPropagation();
  }

  onDragEnd(): void {
    this.dragOverFolderId = null;
  }

  onDragOver(event: DragEvent, folderId: string | number): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverFolderId = folderId;
  }

  onDragLeave(event: DragEvent, folderId: string | number): void {
    const el = event.currentTarget as HTMLElement;
    if (!el.contains(event.relatedTarget as Node)) {
      if (this.dragOverFolderId === folderId) {
        this.dragOverFolderId = null;
      }
    }
  }

  onDrop(event: DragEvent, targetFolderId: string | number): void {
    event.preventDefault();
    this.dragOverFolderId = null;

    const raw = event.dataTransfer?.getData('application/json');
    if (!raw) return;

    const { id, type } = JSON.parse(raw) as { id: string; type: 'file' | 'folder' };

    if (type === 'folder' && String(id) === String(targetFolderId)) return;

    const actualParent = targetFolderId === 0 ? null : String(targetFolderId);

    if (type === 'file') {
      this.fileService.updateFile(id, { folderId: actualParent }).subscribe({
        next: () => {
          this.showToast('File moved!', 'success');
          this.folderService.folderChanged$.next();
        },
        error: () => this.showToast('Failed to move file.', 'warning'),
      });
    } else {
      const folder = this.folders.find((f) => String(f.id) === id);
      if (!folder) return;
      const previousParentId = folder.parentId;
      folder.parentId = actualParent;
      this.buildTree();
      this.cdr.detectChanges();

      this.folderService.updateFolder(id, { parentId: actualParent }).subscribe({
        next: () => {
          this.folderService.folderChanged$.next();
          this.showToast('Folder moved!', 'success');
        },
        error: () => {
          folder.parentId = previousParentId;
          this.buildTree();
          this.cdr.detectChanges();
          this.showToast('Failed to move folder.', 'warning');
        },
      });
    }
  }

  openConfirm(message: string, action: () => void): void {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirmModal = true;
  }
}
