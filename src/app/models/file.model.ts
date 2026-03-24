export interface File {
  id: string | number;
  name: string;
  folderId: string | number | null;
  userId: string | number;
  size: number;
  ext: string;
  modified: string;
  tags: string[];
}