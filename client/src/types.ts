export interface Client {
  id: string;
  name: string;
  mobile: string;
  status: 'not_started' | 'in_progress' | 'complete';
  docsCollected: number;
  docsPending: string[];
  lastReplyAt: string | null;
  driveFolderId: string | null;
  taxYear?: number;
}

export interface DashboardData {
  preparer: { id: string; name: string; email: string };
  clients: Client[];
  stats: { total: number; waiting: number; complete: number; issues: number };
}
