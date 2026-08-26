// Mapeamento entre entidades do dominio e as tabelas do Supabase.
// Estrategia: cada agregado (workout, session, ...) e uma linha com o objeto
// completo em `data` (jsonb) + colunas de topo para indexacao/RLS. Isso mantem
// a sincronizacao simples e idempotente (upsert por id).
import { supabase } from '@/lib/supabase';
import { nowISO } from '@/lib/id';
import type { SyncEntityType, SyncQueueItem } from '@/domain/types';

export const TABLE: Record<SyncEntityType, string> = {
  workout: 'workouts',
  program: 'programs',
  periodization: 'periodizations',
  session: 'workout_sessions',
  personalRecord: 'personal_records',
  customExercise: 'custom_exercises',
  settings: 'user_settings',
};

function sb() {
  if (!supabase) throw new Error('Supabase nao configurado');
  return supabase;
}

function rowFor(entityType: SyncEntityType, userId: string, p: any): Record<string, unknown> {
  const base = {
    user_id: userId,
    data: p,
    updated_at: p.updatedAt ?? nowISO(),
    deleted_at: p.deletedAt ?? null,
  };
  switch (entityType) {
    case 'workout':
      return { id: p.id, name: p.name, archived: !!p.archived, ...base };
    case 'program':
      return { id: p.id, active: !!p.active, ...base };
    case 'periodization':
      return { id: p.id, name: p.name, ...base };
    case 'session':
      return { id: p.id, workout_id: p.workoutId ?? null, date: p.date, status: p.status, ...base };
    case 'personalRecord':
      return { id: p.id, exercise_id: p.exerciseId, type: p.type, ...base };
    case 'customExercise':
      return { id: p.id, ...base };
    case 'settings':
      return { user_id: userId, data: p, updated_at: p.updatedAt ?? nowISO() };
  }
}

/** Envia uma operacao da fila para o Supabase (idempotente). */
export async function pushOp(item: SyncQueueItem): Promise<void> {
  const table = TABLE[item.entityType];
  if (item.operation === 'delete') {
    if (item.entityType === 'settings') {
      const { error } = await sb().from(table).delete().eq('user_id', item.userId);
      if (error) throw error;
    } else {
      const { error } = await sb()
        .from(table)
        .update({ deleted_at: nowISO(), updated_at: nowISO() })
        .eq('id', item.entityId)
        .eq('user_id', item.userId);
      if (error) throw error;
    }
    return;
  }
  const row = rowFor(item.entityType, item.userId, item.payload);
  const onConflict = item.entityType === 'settings' ? 'user_id' : 'id';
  const { error } = await sb().from(table).upsert(row, { onConflict });
  if (error) throw error;
}

export interface PulledRow {
  entityType: SyncEntityType;
  id: string;
  data: any;
  updatedAt: string;
  deletedAt: string | null;
}

/** Puxa todas as linhas do usuario atualizadas apos `since`. */
export async function pullSince(userId: string, since: string | null): Promise<PulledRow[]> {
  const out: PulledRow[] = [];
  for (const entityType of Object.keys(TABLE) as SyncEntityType[]) {
    const table = TABLE[entityType];
    let q = sb().from(table).select('*').eq('user_id', userId);
    if (since) q = q.gt('updated_at', since);
    const { data, error } = await q;
    if (error) throw error;
    for (const row of (data ?? []) as any[]) {
      out.push({
        entityType,
        id: row.id ?? row.user_id,
        data: row.data,
        updatedAt: row.updated_at ?? nowISO(),
        deletedAt: row.deleted_at ?? null,
      });
    }
  }
  return out;
}
