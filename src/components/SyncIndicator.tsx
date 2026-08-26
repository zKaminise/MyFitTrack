import { useSyncStatus } from '@/sync/status';
import { isSupabaseConfigured } from '@/lib/supabase';

export function SyncIndicator({ compact = false }: { compact?: boolean }) {
  const { state, pending, online } = useSyncStatus();
  if (!isSupabaseConfigured) return null; // modo local: sem nuvem

  let dot = 'ok';
  let label = 'Sincronizado';
  if (!online || state === 'offline') {
    dot = '';
    label = 'Offline';
  } else if (state === 'syncing') {
    dot = 'busy';
    label = 'Sincronizando';
  } else if (state === 'pending' || pending > 0) {
    dot = 'busy';
    label = `${pending} pendente${pending === 1 ? '' : 's'}`;
  } else if (state === 'error') {
    dot = 'warn';
    label = 'Tentando novamente';
  }

  return (
    <span className="sync-pill" title={label}>
      <span className={`sync-dot ${dot}`} />
      {!compact && label}
    </span>
  );
}
