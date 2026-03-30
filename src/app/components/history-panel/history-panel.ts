import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryService } from '../../services/history.service';
import { FileService } from '../../services/file.service';
import { FolderService } from '../../services/folder.service';
import { HistoryRecord } from '../../models/history.model';

@Component({
  selector: 'app-history-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history-panel.html',
  styleUrl: './history-panel.css',
})
export class HistoryPanelComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  records: HistoryRecord[] = [];
  loading = false;

  constructor(
    private historyService: HistoryService,
    private fileService: FileService,
    private folderService: FolderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.historyService.getHistory().subscribe({
      next: (records) => {
        this.records = records;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  rollback(record: HistoryRecord): void {
    if (record.rolledBack) return;

    switch (record.action) {
      case 'create':
        if (record.entityType === 'file') {
          this.fileService.deleteFile(record.entityId).subscribe(() => this.onRollbackDone(record));
        } else {
          this.folderService.deleteFolder(record.entityId).subscribe(() => this.onRollbackDone(record));
        }
        break;

      case 'rename':
        if (record.entityType === 'file') {
          this.fileService.updateFile(record.entityId, { name: record.previousState!['name'] })
            .subscribe(() => this.onRollbackDone(record));
        } else {
          this.folderService.updateFolder(record.entityId, { name: record.previousState!['name'] })
            .subscribe(() => this.onRollbackDone(record));
        }
        break;

      case 'move':
        if (record.entityType === 'file') {
          this.fileService.updateFile(record.entityId, { folderId: record.previousState!['folderId'] })
            .subscribe(() => this.onRollbackDone(record));
        } else {
          this.folderService.updateFolder(record.entityId, { parentId: record.previousState!['parentId'] })
            .subscribe(() => this.onRollbackDone(record));
        }
        break;

      case 'delete':
        if (record.entityType === 'file') {
          this.fileService.uploadFile(record.previousState as any).subscribe(() => this.onRollbackDone(record));
        } else {
          this.folderService.createFolder(record.previousState as any).subscribe(() => this.onRollbackDone(record));
        }
        break;
    }
  }

  private onRollbackDone(record: HistoryRecord): void {
    this.historyService.markRolledBack(record.id).subscribe(() => {
      this.loadHistory();
      this.folderService.folderChanged$.next();
    });
  }

  clearAll(): void {
    this.historyService.clearHistory().subscribe(() => {
      this.records = [];
      this.cdr.detectChanges();
    });
  }

  getIcon(action: string): string {
    switch (action) {
      case 'create': return 'bi-plus-circle';
      case 'rename': return 'bi-pencil';
      case 'move': return 'bi-folder-symlink';
      case 'delete': return 'bi-trash3';
      default: return 'bi-clock';
    }
  }

  getIconColor(action: string): string {
    switch (action) {
      case 'create': return 'text-success';
      case 'rename': return 'text-primary';
      case 'move': return 'text-info';
      case 'delete': return 'text-danger';
      default: return 'text-secondary';
    }
  }

  getDescription(record: HistoryRecord): string {
    const type = record.entityType;
    const name = record.entityName;
    switch (record.action) {
      case 'create':
        return `Created ${type} "${name}"`;
      case 'rename': {
        const newName = record.newState?.['name'] ?? '';
        return `Renamed ${type} "${name}" to "${newName}"`;
      }
      case 'move':
        return `Moved ${type} "${name}"`;
      case 'delete':
        return `Deleted ${type} "${name}"`;
      default:
        return `${record.action} ${type} "${name}"`;
    }
  }

  getTimeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }
}
