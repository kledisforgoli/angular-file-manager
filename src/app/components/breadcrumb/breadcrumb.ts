import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FolderService } from '../../services/folder.service';
import { Folder } from '../../models/folder.model';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css'
})
export class BreadcrumbComponent implements OnChanges {
  @Input() selectedFolderId: string | number = 0;
  @Output() folderSelected = new EventEmitter<string | number>();

  folders: Folder[] = [];
  breadcrumb: { id: string | number; name: string }[] = [];

  constructor(private folderService: FolderService) {}

  ngOnChanges(): void {
    this.folderService.getFolders().subscribe({
      next: (folders) => {
        this.folders = folders;
        this.buildBreadcrumb();
      }
    });
  }

buildBreadcrumb(): void {
  this.breadcrumb = [{ id: 0, name: 'My Drive' }];

  if (this.selectedFolderId == 0) return;

  const path: { id: string | number; name: string }[] = [];
  let current = this.folders.find(f => String(f.id) === String(this.selectedFolderId));

  while (current) {
    path.unshift({ id: current.id ?? '', name: current.name });
    current = current.parentId !== null
      ? this.folders.find(f => String(f.id) === String(current!.parentId))
      : undefined;
  }

  this.breadcrumb = [{ id: 0, name: 'My Drive' }, ...path];
}

  navigateTo(id: string | number): void {
    this.folderSelected.emit(id);
  }
}