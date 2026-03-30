export type HistoryActionType = 'create' | 'rename' | 'move' | 'delete';
export type HistoryEntityType = 'file' | 'folder';

export interface HistoryRecord {
  id: string;
  userId: string;
  entityType: HistoryEntityType;
  entityId: string | number;
  action: HistoryActionType;
  entityName: string;
  timestamp: string;
  previousState: Record<string, any> | null;
  newState: Record<string, any> | null;
  rolledBack: boolean;
}
