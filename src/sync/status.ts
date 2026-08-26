import { create } from 'zustand';

export type SyncState = 'idle' | 'syncing' | 'pending' | 'offline' | 'error' | 'local';

interface SyncStatusStore {
  state: SyncState;
  pending: number;
  online: boolean;
  lastSync: string | null;
  set: (patch: Partial<Omit<SyncStatusStore, 'set'>>) => void;
}

export const useSyncStatus = create<SyncStatusStore>((set) => ({
  state: 'idle',
  pending: 0,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSync: null,
  set: (patch) => set(patch),
}));
