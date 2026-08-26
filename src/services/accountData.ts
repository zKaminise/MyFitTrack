import {
  exerciseRepo,
  personalRecordRepo,
  periodizationRepo,
  programRepo,
  sessionRepo,
  workoutRepo,
} from '@/repositories/dexie';
import { getCurrentUserId } from '@/repositories/context';
import { db } from '@/db/database';

/** Remove o historico da conta atual e gera tombstones para a nuvem. */
export async function clearCurrentUserHistory(): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Nenhum usuario autenticado');
  const [sessions, records] = await Promise.all([
    db.sessions.where('userId').equals(userId).toArray(),
    db.personalRecords.where('userId').equals(userId).toArray(),
  ]);
  for (const session of sessions) await sessionRepo.remove(session.id);
  for (const record of records) await personalRecordRepo.remove(record.id);
}

/**
 * Remove todos os agregados de treino da conta atual. A conta e as configuracoes
 * permanecem; cada remocao entra na fila para nao reaparecer apos um pull.
 */
export async function resetCurrentUserTrainingData(): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Nenhum usuario autenticado');
  const [workouts, programs, periods, sessions, records, customExercises] = await Promise.all([
    db.workouts.where('userId').equals(userId).toArray(),
    db.programs.where('userId').equals(userId).toArray(),
    db.periodizations.where('userId').equals(userId).toArray(),
    db.sessions.where('userId').equals(userId).toArray(),
    db.personalRecords.where('userId').equals(userId).toArray(),
    db.exercises.where('userId').equals(userId).toArray(),
  ]);
  for (const workout of workouts) await workoutRepo.remove(workout.id);
  for (const program of programs) await programRepo.remove(program.id);
  for (const period of periods) await periodizationRepo.remove(period.id);
  for (const session of sessions) await sessionRepo.remove(session.id);
  for (const record of records) await personalRecordRepo.remove(record.id);
  for (const exercise of customExercises) await exerciseRepo.remove(exercise.id);
  await db.backups.where('userId').equals(userId).delete();
}
