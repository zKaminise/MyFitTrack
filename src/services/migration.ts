// Migracao de dados locais (fase pre-conta) para uma conta.
// Preserva UUIDs, associa ao user_id e enfileira upload; nunca apaga antes de
// concluir (reatribui em lugar). O prompt aparece apenas para a PRIMEIRA conta
// do dispositivo (flag global), evitando oferecer dados de uma pessoa a outra.
import { db, LEGACY_USER_ID } from '@/db/database';
import { nowISO } from '@/lib/id';
import {
  workoutRepo,
  programRepo,
  periodizationRepo,
  sessionRepo,
  personalRecordRepo,
  exerciseRepo,
  settingsRepo,
} from '@/repositories/dexie';

const HANDLED_KEY = 'fs2.legacyHandled';

export interface LegacyCounts {
  workouts: number;
  sessions: number;
  exercises: number; // exercicios personalizados legados
  total: number;
}

export function legacyHandled(): boolean {
  return localStorage.getItem(HANDLED_KEY) === 'true';
}

function markHandled(): void {
  localStorage.setItem(HANDLED_KEY, 'true');
}

export async function detectLegacyData(): Promise<LegacyCounts | null> {
  if (legacyHandled()) return null;
  const [workouts, sessions, exercises] = await Promise.all([
    db.workouts.where('userId').equals(LEGACY_USER_ID).count(),
    db.sessions.where('userId').equals(LEGACY_USER_ID).count(),
    db.exercises.where('userId').equals(LEGACY_USER_ID).count(),
  ]);
  const total = workouts + sessions + exercises;
  if (total === 0) return null;
  return { workouts, sessions, exercises, total };
}

/** Reatribui os dados legados ao usuario e envia para a fila de sync. */
export async function importLegacyToUser(userId: string): Promise<void> {
  const reassign = async (
    rows: { id: string; userId?: string | null }[],
    put: (r: any) => Promise<void>,
  ) => {
    for (const r of rows) await put({ ...r, userId, updatedAt: nowISO() });
  };

  const [workouts, programs, periods, sessions, prs, exercises] = await Promise.all([
    db.workouts.where('userId').equals(LEGACY_USER_ID).toArray(),
    db.programs.where('userId').equals(LEGACY_USER_ID).toArray(),
    db.periodizations.where('userId').equals(LEGACY_USER_ID).toArray(),
    db.sessions.where('userId').equals(LEGACY_USER_ID).toArray(),
    db.personalRecords.where('userId').equals(LEGACY_USER_ID).toArray(),
    db.exercises.where('userId').equals(LEGACY_USER_ID).toArray(),
  ]);

  await reassign(workouts, (r) => workoutRepo.put(r));
  await reassign(programs, (r) => programRepo.put(r));
  await reassign(periods, (r) => periodizationRepo.put(r));
  await reassign(sessions, (r) => sessionRepo.put(r));
  await reassign(prs, (r) => personalRecordRepo.put(r));
  await reassign(exercises, (r) => exerciseRepo.put(r));

  // Marca onboarding concluido (o usuario ja tem dados) e importa favoritos legados.
  const legacySettings = await db.settings.get(LEGACY_USER_ID);
  const current = await settingsRepo.get();
  if (current) {
    const merged = Array.from(
      new Set([...(current.favoriteExerciseIds ?? []), ...(legacySettings?.favoriteExerciseIds ?? [])]),
    );
    await settingsRepo.save({ ...current, favoriteExerciseIds: merged, onboarded: true });
  }
  if (legacySettings) await db.settings.delete(LEGACY_USER_ID);

  markHandled();
}

/** Usuario optou por comecar do zero — nao importa, e nao oferece a outros. */
export function skipLegacyImport(): void {
  markHandled();
}
