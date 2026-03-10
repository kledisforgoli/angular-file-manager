export interface File {
  id: string | number;
  name: string;
  folderId: string | number | null;
  size: number;
  ext: string;
  modified: string;
  tags: string[];
}