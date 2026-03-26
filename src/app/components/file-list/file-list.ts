import { Component, Input, OnChanges, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
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
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  showConfirmModal = false;
  confirmMessage = '';
  confirmAction: (() => void) | null = null;

  showBottomSheet = false;
  bottomSheetFile: File | null = null;

  dragOverFolderId: string | number | null = null;

  showMoveModal = false;
  moveTargetId: string | number | null = null;
  moveFolderList: Folder[] = [];

  constructor(
    private fileService: FileService,
    private folderService: FolderService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
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
    let result: File[];

    if (this.searchQuery && this.selectedFolderId == 0) {
      result = this.allFiles.filter((f) =>
        f.name.toLowerCase().includes(this.searchQuery.toLowerCase()),
      );
    } else {
      result = this.allFiles.filter((f) => {
        if (this.selectedFolderId == 0) {
          return f.folderId === null || f.folderId === undefined;
        }
        return String(f.folderId) === String(this.selectedFolderId);
      });

      if (this.searchQuery) {
        result = result.filter((f) => f.name.toLowerCase().includes(this.searchQuery.toLowerCase()));
      }
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
      userId: String(this.authService.getCurrentUser()?.id ?? ''),
      size: Math.floor(Math.random() * 900000 + 1000),
      ext,
      modified: new Date().toISOString().split('T')[0],
      tags: [],
    };
    this.showUploadModal = false;
    this.newFileName = '';
    this.allFiles = [...this.allFiles, file as unknown as File];
    this.allExtensions = [...new Set(this.allFiles.map((f) => f.ext).filter(Boolean))];
    this.applyFilters();
    this.cdr.detectChanges();
    this.showToast('File uploaded successfully!', 'success');
    this.fileService.uploadFile(file as unknown as File).subscribe({
      next: () => {
        this.loadAll();
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
      userId: String(this.authService.getCurrentUser()?.id ?? ''),
    };
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
      this.allFiles = this.allFiles.filter((f) => String(f.id) !== String(id));
      this.applyFilters();
      this.cdr.detectChanges();
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
        const fileIds = ids.filter((id) => this.allFiles.some((f) => f.id === id));
        const folderIds = ids.filter((id) => this.folders.some((f) => f.id === id));

        this.allFiles = this.allFiles.filter((f) => !fileIds.includes(f.id));
        this.folders = this.folders.filter((f) => !folderIds.includes(f.id!));
        this.selectedItems = [];
        this.subFolders = this.getSubFolders();
        this.applyFilters();
        this.cdr.detectChanges();

        const total = fileIds.length + folderIds.length;
        let completed = 0;
        const onComplete = () => {
          completed++;
          if (completed === total) {
            this.loadAll();
            this.showToast('Items deleted.', 'warning');
          }
        };

        fileIds.forEach((id) => {
          this.fileService.deleteFile(id).subscribe({ next: onComplete });
        });
        folderIds.forEach((id) => {
          this.folderService.deleteFolder(id).subscribe({ next: onComplete });
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
    this.cdr.detectChanges();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toast = null;
      this.cdr.detectChanges();
    }, 5000);
  }

  openMoveModal(): void {
    if (!this.selectedItems.length) return;
    const selectedSet = new Set(this.selectedItems.map(String));
    this.moveFolderList = this.folders.filter((f) => !selectedSet.has(String(f.id)));
    this.moveTargetId = null;
    this.showMoveModal = true;
  }

  moveSelected(): void {
    if (this.moveTargetId === null || !this.selectedItems.length) return;

    const targetFolderId = this.moveTargetId;
    const actualParent = targetFolderId === 0 ? null : String(targetFolderId);

    const ids = [...this.selectedItems];
    const fileIds = ids.filter((id) => this.allFiles.some((f) => f.id === id));
    const folderIds = ids.filter((id) => this.folders.some((f) => f.id === id));

    for (const fid of fileIds) {
      const file = this.allFiles.find((f) => f.id === fid);
      if (file) file.folderId = actualParent;
    }
    for (const fid of folderIds) {
      const folder = this.folders.find((f) => f.id === fid);
      if (folder) folder.parentId = actualParent;
    }

    this.showMoveModal = false;
    this.selectedItems = [];
    this.subFolders = this.getSubFolders();
    this.applyFilters();
    this.cdr.detectChanges();

    const total = ids.length;
    let completed = 0;

    const onComplete = () => {
      completed++;
      if (completed === total) {
        if (folderIds.length) this.folderService.folderChanged$.next();
        this.loadAll();
        this.showToast(`Moved ${total} item(s) successfully.`, 'success');
      }
    };

    for (const fid of fileIds) {
      this.fileService.updateFile(fid, { folderId: actualParent }).subscribe({ next: onComplete });
    }
    for (const fid of folderIds) {
      this.folderService.updateFolder(fid, { parentId: actualParent }).subscribe({ next: onComplete });
    }
  }

  onDragStart(event: DragEvent, id: string | number, type: 'file' | 'folder'): void {
    let items: { id: string; type: 'file' | 'folder' }[];

    if (this.selectedItems.includes(id) && this.selectedItems.length > 1) {
      items = this.selectedItems.map((sid) => {
        const isFile = this.allFiles.some((f) => f.id === sid);
        return { id: String(sid), type: (isFile ? 'file' : 'folder') as 'file' | 'folder' };
      });
    } else {
      items = [{ id: String(id), type }];
    }

    event.dataTransfer?.setData('application/json', JSON.stringify({ items }));
    event.dataTransfer!.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent, targetFolderId: string | number): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverFolderId = targetFolderId;
  }

  onDragLeave(event: DragEvent, targetFolderId: string | number): void {
    const el = event.currentTarget as HTMLElement;
    if (!el.contains(event.relatedTarget as Node)) {
      if (this.dragOverFolderId === targetFolderId) {
        this.dragOverFolderId = null;
      }
    }
  }

  onDrop(event: DragEvent, targetFolderId: string | number): void {
    event.preventDefault();
    this.dragOverFolderId = null;

    const raw = event.dataTransfer?.getData('application/json');
    if (!raw) return;

    const payload = JSON.parse(raw);
    const items: { id: string; type: 'file' | 'folder' }[] = payload.items
      ?? [{ id: payload.id, type: payload.type }];

    const validItems = items.filter(
      (item) => !(item.type === 'folder' && String(item.id) === String(targetFolderId)),
    );
    if (!validItems.length) return;

    const fileItems = validItems.filter((i) => i.type === 'file');
    const folderItems = validItems.filter((i) => i.type === 'folder');

    const rollbacks: (() => void)[] = [];

    for (const fi of fileItems) {
      const file = this.allFiles.find((f) => String(f.id) === fi.id);
      if (!file) continue;
      const prev = file.folderId;
      file.folderId = String(targetFolderId);
      rollbacks.push(() => { file.folderId = prev; });
    }

    for (const fi of folderItems) {
      const folder = this.folders.find((f) => String(f.id) === fi.id);
      if (!folder) continue;
      const prev = folder.parentId;
      folder.parentId = String(targetFolderId);
      rollbacks.push(() => { folder.parentId = prev; });
    }

    this.selectedItems = [];
    this.subFolders = this.getSubFolders();
    this.applyFilters();
    this.cdr.detectChanges();

    let completed = 0;
    const total = validItems.length;
    let hasError = false;

    const onComplete = (err: boolean) => {
      if (err) hasError = true;
      completed++;
      if (completed === total) {
        if (hasError) {
          rollbacks.forEach((rb) => rb());
          this.subFolders = this.getSubFolders();
          this.applyFilters();
          this.cdr.detectChanges();
          this.showToast('Failed to move some items.', 'warning');
        } else {
          this.showToast(`Moved ${total} item(s) successfully.`, 'success');
        }
        if (folderItems.length) this.folderService.folderChanged$.next();
        this.loadAll();
      }
    };

    for (const fi of fileItems) {
      this.fileService.updateFile(fi.id, { folderId: String(targetFolderId) }).subscribe({
        next: () => onComplete(false),
        error: () => onComplete(true),
      });
    }
    for (const fi of folderItems) {
      this.folderService.updateFolder(fi.id, { parentId: String(targetFolderId) }).subscribe({
        next: () => onComplete(false),
        error: () => onComplete(true),
      });
    }
  }

  onDragEnd(): void {
    this.dragOverFolderId = null;
  }

  navigateToFolder(id: string | number): void {
    this.selectedFolderId = id; // ← update lokal menjëherë
    this.subFolders = this.getSubFolders();
    this.applyFilters();
    this.folderSelected.emit(id);
  }
}
