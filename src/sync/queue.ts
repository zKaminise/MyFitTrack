// Fila de sincronizacao (offline-first). Cada escrita local em dado de usuario
// enfileira uma operacao; a engine drena a fila quando ha rede + Supabase.
// Em modo LOCAL (sem Supabase) e um no-op — nao ha nuvem para sincronizar.
import { db } from '@/db/database';
import { uuid, nowISO } from '@/lib/id';
import { getCurrentUserId } from '@/repositories/context';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { SyncEntityType, SyncOperation } from '@/domain/types';
import { scheduleSync, refreshPendingCount } from './engine';

export function syncEnabled(): boolean {
  return isSupabaseConfigured && !!getCurrentUserId();
}

export async function enqueue(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: unknown,
): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId || !isSupabaseConfigured) return; // modo local: sem fila de nuvem

  // Coalesce: substitui operacoes pendentes da mesma entidade (idempotencia).
  const dupes = await db.syncQueue
    .where('userId')
    .equals(userId)
    .filter((i) => i.entityId === entityId && i.entityType === entityType && i.status !== 'syncing')
    .toArray();
  if (dupes.length) await db.syncQueue.bulkDelete(dupes.map((d) => d.id));

  await db.syncQueue.add({
    id: uuid(),
    userId,
    entityType,
    entityId,
    operation,
    payload,
    createdAt: nowISO(),
    retryCount: 0,
    status: 'pending',
  });

  await refreshPendingCount();
  scheduleSync();
}
