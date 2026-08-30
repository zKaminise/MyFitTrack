// Engine de sincronizacao. Drena a fila (push) e puxa atualizacoes (pull).
// Local-first: nunca bloqueia a UI; roda em segundo plano quando ha rede.
import { db } from '@/db/database';
import { nowISO } from '@/lib/id';
import { getCurrentUserId } from '@/repositories/context';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSyncStatus } from './status';
import { pushOp, pullSince, type PulledRow } from './cloudRepo';
import type { SyncEntityType } from '@/domain/types';

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let interval: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function localTable(entityType: SyncEntityType) {
  switch (entityType) {
    case 'workout': return db.workouts;
    case 'program': return db.programs;
    case 'periodization': return db.periodizations;
    case 'session': return db.sessions;
    case 'personalRecord': return db.personalRecords;
    case 'customExercise': return db.exercises;
    case 'settings': return db.settings;
    case 'scheduleOverride': return db.scheduleOverrides;
    case 'nutritionSettings': return db.nutritionSettings;
    case 'userFood': return db.userFoods;
    case 'savedMeal': return db.savedMeals;
    case 'nutritionDay': return db.nutritionDays;
  }
}

export async function refreshPendingCount(): Promise<void> {
  const uid = getCurrentUserId();
  const status = useSyncStatus.getState();
  if (!uid || !isSupabaseConfigured) {
    status.set({ pending: 0, state: isSupabaseConfigured ? 'idle' : 'local' });
    return;
  }
  const n = await db.syncQueue.where('userId').equals(uid).count();
  status.set({ pending: n });
}

export function scheduleSync(delay = 800): void {
  if (!isSupabaseConfigured) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void runSync(), delay);
}

export async function runSync(): Promise<void> {
  if (!isSupabaseConfigured || running) return;
  const uid = getCurrentUserId();
  if (!uid) return;
  const status = useSyncStatus.getState();
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    status.set({ state: 'offline', online: false });
    return;
  }
  running = true;
  status.set({ state: 'syncing', online: true });
  try {
    await pushQueue(uid);
    await pullRemote(uid);
    await refreshPendingCount();
    const pending = useSyncStatus.getState().pending;
    status.set({ state: pending > 0 ? 'pending' : 'idle', lastSync: nowISO() });
  } catch (e) {
    status.set({ state: 'error' });
    // Nao propaga: dados seguem seguros localmente; nova tentativa depois.
    console.warn('[sync] falha ao sincronizar (tentaremos novamente)');
    void e;
  } finally {
    running = false;
  }
}

async function pushQueue(uid: string): Promise<void> {
  const items = await db.syncQueue.where('userId').equals(uid).sortBy('createdAt');
  for (const item of items) {
    try {
      await pushOp(item);
      await db.syncQueue.delete(item.id);
    } catch {
      await db.syncQueue.update(item.id, {
        status: 'error',
        retryCount: item.retryCount + 1,
        lastError: 'push failed',
      });
      // Continua com os demais; a fila persiste para nova tentativa.
    }
  }
}

async function pullRemote(uid: string): Promise<void> {
  const meta = await db.syncMeta.get(uid);
  const since = meta?.lastPulledAt ?? null;
  const rows = await pullSince(uid, since);

  // Nunca sobrescreve entidades com operacoes locais pendentes.
  const pending = new Set(
    (await db.syncQueue.where('userId').equals(uid).toArray()).map((i) => `${i.entityType}:${i.entityId}`),
  );

  let maxUpdated = since ?? '';
  for (const row of rows) {
    if (row.updatedAt > maxUpdated) maxUpdated = row.updatedAt;
    if (pending.has(`${row.entityType}:${row.id}`)) continue;
    await applyPulled(row);
  }

  await db.syncMeta.put({ id: uid, lastPulledAt: maxUpdated || nowISO() });
}

async function applyPulled(row: PulledRow): Promise<void> {
  const table = localTable(row.entityType) as any;
  if (row.deletedAt) {
    await table.delete(
      row.entityType === 'settings' || row.entityType === 'nutritionSettings'
        ? row.data?.id ?? row.id
        : row.id,
    );
    return;
  }
  const local = await table.get(
    row.entityType === 'settings' || row.entityType === 'nutritionSettings'
      ? row.data?.id ?? row.id
      : row.id,
  );
  // Last-write-wins por updatedAt.
  if (!local || (row.data?.updatedAt ?? row.updatedAt) >= (local.updatedAt ?? '')) {
    await table.put(row.data);
  }
}

/** Primeira sincronizacao apos login: pull completo. */
export async function fullPull(uid: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await db.syncMeta.put({ id: uid, lastPulledAt: null });
  await runSync();
}

/** Inicializa listeners de rede e o loop periodico. Chamado uma vez no boot. */
export function initSync(): void {
  if (!isSupabaseConfigured) {
    useSyncStatus.getState().set({ state: 'local' });
    return;
  }
  if (initialized) return;
  initialized = true;
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      useSyncStatus.getState().set({ online: true });
      scheduleSync(200);
    });
    window.addEventListener('offline', () => {
      useSyncStatus.getState().set({ online: false, state: 'offline' });
    });
  }
  if (!interval) interval = setInterval(() => void runSync(), 30_000);
}
