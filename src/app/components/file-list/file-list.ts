import { Component, Input, OnChanges, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../services/file.service';
import { FolderService } from '../../services/folder.service';
import { AuthService } from '../../services/auth.service';
import { File } from '../../models/file.model';
import { Folder } from '../../models/folder.model';
import cuid from 'cuid';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-list.html',
  styleUrl: './file-list.css',
})
export class FileListComponent implements OnChanges, OnInit {
  @Input() selectedFolderId: string | number = 0;
  @Output() folderSelected = new EventEmitter<string | number>();

  allFiles: File[] = [];
  folders: Folder[] = [];
  subFolders: Folder[] = [];

  filteredFiles: File[] = [];
  selectedItems: (string | number)[] = [];
  searchQuery = '';
  sortBy = 'name';
  sortDir = 'asc';
  filterExt = '';
  isAdmin = false;
  allExtensions: string[] = [];

  showUploadModal = false;
  showNewFolderModal = false;
  showRenameModal = false;
  showPreviewModal = false;

  newFileName = '';
  newFolderName = '';
  renameValue = '';
  renameId: string | number | null = null;
  renameType: 'file' | 'folder' = 'file';
  previewFile: File | null = null;

  toast: { message: string; type: string } | null = null;

  showConfirmModal = false;
  confirmMessage = '';
  confirmAction: (() => void) | null = null;

  showBottomSheet = false;
  bottomSheetFile: File | null = null;

  constructor(
    private fileService: FileService,
    private folderService: FolderService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.loadAll();

    this.folderService.folderChanged$.subscribe(() => {
      this.loadAll();
    });
  }

  ngOnChanges(): void {
    this.subFolders = this.getSubFolders();
    this.applyFilters();
  }

  loadAll(): void {
    this.folderService.getFolders().subscribe((folders) => {
      this.folders = folders;
      this.subFolders = this.getSubFolders();
      this.applyFilters();
    });

    this.fileService.getFiles().subscribe((files) => {
      this.allFiles = files;
      this.allExtensions = [...new Set(files.map((f) => f.ext).filter(Boolean))];
      this.applyFilters();
    });
  }

  applyFilters(): void {
    let result = this.allFiles.filter((f) => {
      if (this.selectedFolderId == 0) {
        return f.folderId === null || f.folderId === undefined;
      }
      return String(f.folderId) === String(this.selectedFolderId);
    });

    if (this.searchQuery) {
      result = result.filter((f) => f.name.toLowerCase().includes(this.searchQuery.toLowerCase()));
    }

    if (this.filterExt) {
      result = result.filter((f) => f.ext === this.filterExt);
    }

    result.sort((a, b) => {
      let va: any, vb: any;
      if (this.sortBy === 'name') {
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
      } else if (this.sortBy === 'size') {
        va = a.size;
        vb = b.size;
      } else {
        va = a.modified;
        vb = b.modified;
      }
      if (va < vb) return this.sortDir === 'asc' ? -1 : 1;
      if (va > vb) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredFiles = result;
  }

  getSubFolders(): Folder[] {
    if (this.selectedFolderId == 0) {
      return this.folders.filter((f) => f.parentId === null);
    }
    return this.folders.filter((f) => String(f.parentId) === String(this.selectedFolderId));
  }

  uploadFile(): void {
    if (!this.newFileName.trim()) return;
    const ext = this.newFileName.split('.').pop()?.toLowerCase() || '';
    const file = {
      id: cuid(),
      name: this.newFileName.trim(),
      folderId: this.selectedFolderId == 0 ? null : String(this.selectedFolderId),
      size: Math.floor(Math.random() * 900000 + 1000),
      ext,
      modified: new Date().toISOString().split('T')[0],
      tags: [],
    };
    this.fileService.uploadFile(file as unknown as File).subscribe({
      next: () => {
        this.showUploadModal = false;
        this.newFileName = '';
        this.loadAll();
        this.showToast('File uploaded successfully!', 'success');
      },
    });
  }

  createFolder(): void {
    if (!this.newFolderName.trim()) return;
    const newId = cuid();
    const folder = {
      id: newId,
      name: this.newFolderName.trim(),
      parentId: this.selectedFolderId == 0 ? null : String(this.selectedFolderId),
    };
    debugger;
    this.folderService.createFolder(folder as unknown as Folder).subscribe({
      next: () => {
        this.showNewFolderModal = false;
        this.newFolderName = '';
        this.folderSelected.emit(newId);
        this.loadAll();
        this.showToast('Folder created!', 'success');
      },
    });
  }

  openRename(id: string | number, name: string, type: 'file' | 'folder'): void {
    this.renameId = id;
    this.renameValue = name;
    this.renameType = type;
    this.showRenameModal = true;
  }

  confirmRename(): void {
    if (!this.renameValue.trim() || !this.renameId) return;
    if (this.renameType === 'file') {
      this.fileService.updateFile(this.renameId, { name: this.renameValue }).subscribe({
        next: () => {
          this.loadAll();
          this.showRenameModal = false;
          this.showToast('Renamed successfully!', 'success');
        },
      });
    } else {
      this.folderService.updateFolder(this.renameId, { name: this.renameValue }).subscribe({
        next: () => {
          this.loadAll();
          this.showRenameModal = false;
          this.showToast('Renamed successfully!', 'success');
        },
      });
    }
  }

  openConfirm(message: string, action: () => void): void {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirmModal = true;
  }

  deleteFile(id: string | number): void {
    this.openConfirm('Are you sure you want to delete this file?', () => {
      this.fileService.deleteFile(id).subscribe({
        next: () => {
          this.loadAll();
          this.showToast('File deleted.', 'warning');
        },
      });
    });
  }

  deleteFolder(id: string | number): void {
    this.openConfirm('Are you sure you want to delete this folder?', () => {
      this.folderService.deleteFolder(id).subscribe({
        next: () => {
          this.loadAll();
          this.showToast('Folder deleted.', 'warning');
        },
      });
    });
  }

  deleteSelected(): void {
    if (!this.selectedItems.length) return;
    this.openConfirm(
      `Are you sure you want to delete ${this.selectedItems.length} item(s)?`,
      () => {
        const ids = [...this.selectedItems];
        let completed = 0;
        ids.forEach((id) => {
          this.fileService.deleteFile(id).subscribe({
            next: () => {
              completed++;
              if (completed === ids.length) {
                this.selectedItems = [];
                this.loadAll();
                this.showToast('Items deleted.', 'warning');
              }
            },
          });
        });
      },
    );
  }

  openBottomSheet(file: File): void {
    this.bottomSheetFile = file;
    this.showBottomSheet = true;
  }

  toggleSelect(id: string | number): void {
    if (this.selectedItems.includes(id)) {
      this.selectedItems = this.selectedItems.filter((i) => i !== id);
    } else {
      this.selectedItems.push(id);
    }
  }

  toggleSelectAll(): void {
    if (this.selectedItems.length === this.filteredFiles.length) {
      this.selectedItems = [];
    } else {
      this.selectedItems = this.filteredFiles.map((f) => f.id!);
    }
  }

  openPreview(file: File): void {
    this.previewFile = file;
    this.showPreviewModal = true;
  }

  copyLink(id: string | number): void {
    navigator.clipboard?.writeText(`http://localhost:3000/files/${id}`);
    this.showToast('Link copied!', 'info');
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  getExtColor(ext: string): string {
    const colors: Record<string, string> = {
      png: 'success',
      jpg: 'success',
      svg: 'success',
      gif: 'success',
      pdf: 'danger',
      fig: 'warning',
      md: 'primary',
      txt: 'secondary',
      xlsx: 'success',
      csv: 'success',
    };
    return colors[ext?.toLowerCase()] || 'secondary';
  }

  toggleSort(field: string): void {
    if (this.sortBy === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDir = 'asc';
    }
    this.applyFilters();
  }

  showToast(message: string, type: string): void {
    this.toast = { message, type };
    setTimeout(() => (this.toast = null), 3000);
  }

  navigateToFolder(id: string | number): void {
    this.selectedFolderId = id; // ← update lokal menjëherë
    this.subFolders = this.getSubFolders();
    this.applyFilters();
    this.folderSelected.emit(id);
  }
}
