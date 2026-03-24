export interface Folder {
  id?: string | number;
  name: string;
  parentId: string | number | null;
  userId: string | number;
}