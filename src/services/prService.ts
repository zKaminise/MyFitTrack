// Recalcula todos os recordes pessoais do usuario atual a partir das sessoes
// concluidas. Usado apos editar/excluir uma sessao. Escopo por usuario.
import { db } from '@/db/database';
import type { PersonalRecord } from '@/domain/types';
import { collectExercisePoints, detectNewPRs } from '@/domain/records';
import { uuid, nowISO } from '@/lib/id';
import { getCurrentUserId } from '@/repositories/context';
import { enqueue } from '@/sync/queue';

export async function recalcAllPRs(): Promise<void> {
  const uid = getCurrentUserId();
  if (!uid) return;
  const sessions = (await db.sessions.where('userId').equals(uid).toArray())
    .filter((s) => s.status === 'completed')
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const records: PersonalRecord[] = [];
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const prior = sessions.slice(0, i);
    for (const ex of session.exercises) {
      const completed = ex.sets.filter((s) => s.completed);
      if (completed.length === 0) continue;
      const history = collectExercisePoints(prior, ex.performedExerciseId);
      const prs = detectNewPRs(history, completed);
      for (const pr of prs) {
        records.push({
          id: uuid(),
          createdAt: nowISO(),
          updatedAt: nowISO(),
          userId: uid,
          exerciseId: ex.performedExerciseId,
          type: pr.type,
          value: pr.value,
          weight: pr.weight ?? null,
          reps: pr.reps ?? null,
          sessionId: session.id,
          date: session.date,
        });
      }
    }
  }

  const oldRecords = await db.personalRecords.where('userId').equals(uid).toArray();
  await db.transaction('rw', db.personalRecords, async () => {
    await db.personalRecords.where('userId').equals(uid).delete();
    if (records.length) await db.personalRecords.bulkPut(records);
  });

  // Sincroniza: remove antigos e envia novos (no-op em modo local).
  for (const old of oldRecords) await enqueue('personalRecord', old.id, 'delete', { id: old.id });
  for (const pr of records) await enqueue('personalRecord', pr.id, 'upsert', pr);
}
