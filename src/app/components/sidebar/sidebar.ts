import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FolderService } from '../../services/folder.service';
import { FileService } from '../../services/file.service';
import { Folder } from '../../models/folder.model';
import { AuthService } from '../../services/auth.service';
import { HistoryService } from '../../services/history.service';
import { HistoryActionType, HistoryEntityType, HistoryRecord } from '../../models/history.model';
import { FormsModule } from '@angular/forms';
import cuid from 'cuid';

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
    private historyService: HistoryService,
    private cdr: ChangeDetectorRef,
  ) {}

  private recordHistory(
    action: HistoryActionType,
    entityType: HistoryEntityType,
    entityId: string | number,
    entityName: string,
    previousState: Record<string, any> | null,
    newState: Record<string, any> | null,
  ): void {
    const record: HistoryRecord = {
      id: cuid(),
      userId: String(this.authService.getCurrentUser()?.id ?? ''),
      entityType,
      entityId,
      action,
      entityName,
      timestamp: new Date().toISOString(),
      previousState,
      newState,
      rolledBack: false,
    };
    this.historyService.addRecord(record).subscribe();
  }

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
        this.recordHistory('create', 'folder', newId, folder.name!, null, { ...folder });
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
      const snapshot = this.folders.find((f) => String(f.id) === String(id));
      this.folders = this.folders.filter((f) => String(f.id) !== String(id));
      this.buildTree();
      this.cdr.detectChanges();

      this.folderService.deleteFolder(id).subscribe({
        next: () => {
          if (snapshot) this.recordHistory('delete', 'folder', id, snapshot.name, { ...snapshot }, null);
          if (String(this.selectedFolderId) === String(id)) {
            this.folderSelected.emit(0);
          }
          this.showToast('Folder deleted.', 'warning');
        },
        error: () => this.loadFolders(),
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
    event.dataTransfer?.setData('application/json', JSON.stringify({ items: [{ id: String(id), type: 'folder' }] }));
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

    const payload = JSON.parse(raw);
    const items: { id: string; type: 'file' | 'folder' }[] = payload.items
      ?? [{ id: payload.id, type: payload.type }];

    const actualParent = targetFolderId === 0 ? null : String(targetFolderId);

    const validItems = items.filter(
      (item) => !(item.type === 'folder' && String(item.id) === String(targetFolderId)),
    );
    if (!validItems.length) return;

    const fileItems = validItems.filter((i) => i.type === 'file');
    const folderItems = validItems.filter((i) => i.type === 'folder');

    const rollbacks: (() => void)[] = [];
    for (const fi of folderItems) {
      const folder = this.folders.find((f) => String(f.id) === fi.id);
      if (!folder) continue;
      const prev = folder.parentId;
      folder.parentId = actualParent;
      rollbacks.push(() => { folder.parentId = prev; });
    }
    if (folderItems.length) {
      this.buildTree();
      this.cdr.detectChanges();
    }

    let completed = 0;
    const total = validItems.length;
    let hasError = false;

    const onComplete = (err: boolean) => {
      if (err) hasError = true;
      completed++;
      if (completed === total) {
        if (hasError) {
          rollbacks.forEach((rb) => rb());
          this.buildTree();
          this.cdr.detectChanges();
          this.showToast('Failed to move some items.', 'warning');
        } else {
          this.showToast(`Moved ${total} item(s)!`, 'success');
        }
        this.folderService.folderChanged$.next();
      }
    };

    for (const fi of fileItems) {
      this.fileService.updateFile(fi.id, { folderId: actualParent }).subscribe({
        next: () => onComplete(false),
        error: () => onComplete(true),
      });
    }
    for (const fi of folderItems) {
      this.folderService.updateFolder(fi.id, { parentId: actualParent }).subscribe({
        next: () => onComplete(false),
        error: () => onComplete(true),
      });
    }
  }

  openConfirm(message: string, action: () => void): void {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirmModal = true;
  }
}
