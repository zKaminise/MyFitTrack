import type { Program, ScheduleOverride } from '@/domain/types';
import { resolveDay } from '@/domain/scheduling';
import { scheduleOverrideRepo } from '@/repositories/dexie';
import { getCurrentUserId } from '@/repositories/context';
import { nowISO, stableUuid } from '@/lib/id';

const overrideId = (userId: string, programId: string, date: string) =>
  stableUuid(`${userId}:schedule:${programId}:${date}`);

export async function replaceScheduleDay(program: Program, date: string, workoutId: string | null) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Nenhum usuario autenticado');
  const base = resolveDay(program, date);
  const stamp = nowISO();
  const row: ScheduleOverride = {
    id: overrideId(userId, program.id, date), userId, programId: program.id, date,
    type: workoutId ? 'replace' : 'rest', originalWorkoutId: base.workoutId,
    overrideWorkoutId: workoutId, createdAt: stamp, updatedAt: stamp,
  };
  await scheduleOverrideRepo.put(row);
  return row;
}

export async function swapScheduleDays(program: Program, firstDate: string, secondDate: string) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Nenhum usuario autenticado');
  const firstBase = resolveDay(program, firstDate);
  const secondBase = resolveDay(program, secondDate);
  const firstId = overrideId(userId, program.id, firstDate);
  const secondId = overrideId(userId, program.id, secondDate);
  const stamp = nowISO();
  await scheduleOverrideRepo.put({
    id: firstId, userId, programId: program.id, date: firstDate, type: 'swap',
    originalWorkoutId: firstBase.workoutId, overrideWorkoutId: secondBase.workoutId,
    pairedOverrideId: secondId, createdAt: stamp, updatedAt: stamp,
  });
  await scheduleOverrideRepo.put({
    id: secondId, userId, programId: program.id, date: secondDate, type: 'swap',
    originalWorkoutId: secondBase.workoutId, overrideWorkoutId: firstBase.workoutId,
    pairedOverrideId: firstId, createdAt: stamp, updatedAt: stamp,
  });
}

export async function restoreScheduleDay(row: ScheduleOverride) {
  await scheduleOverrideRepo.remove(row.id);
  if (row.pairedOverrideId) await scheduleOverrideRepo.remove(row.pairedOverrideId);
}
