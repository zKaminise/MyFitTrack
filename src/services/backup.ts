// Servico de backup: exportar, importar e snapshots automaticos internos.
import { db } from '@/db/database';
import type { BackupData, BackupSnapshot } from '@/domain/types';
import { validateBackup } from '@/domain/backupSchema';
import { backupRepo } from '@/repositories/dexie';
import { uuid, nowISO } from '@/lib/id';
import { getCurrentUserId } from '@/repositories/context';
import { enqueue } from '@/sync/queue';

const BACKUP_VERSION = 3;
const MAX_AUTO_SNAPSHOTS = 5;

/** Backup dos dados da CONTA ATUAL (nunca inclui dados de outros usuarios). */
export async function buildBackup(): Promise<BackupData> {
  const uid = getCurrentUserId();
  const mine = <T extends { userId?: string | null }>(arr: T[]) =>
    arr.filter((r) => r.userId === uid);

  const [settings, exercisesAll, workouts, programs, periodizations, sessions, personalRecords] =
    await Promise.all([
      uid ? db.settings.get(uid) : undefined,
      db.exercises.toArray(),
      db.workouts.toArray(),
      db.programs.toArray(),
      db.periodizations.toArray(),
      db.sessions.toArray(),
      db.personalRecords.toArray(),
    ]);

  return {
    format: 'myfittrack',
    version: BACKUP_VERSION,
    exportedAt: nowISO(),
    settings: settings ?? null,
    // Apenas exercicios personalizados do usuario (a biblioteca oficial e local/global).
    exercises: exercisesAll.filter((e) => e.isCustom && e.userId === uid),
    workouts: mine(workouts),
    programs: mine(programs),
    periodizations: mine(periodizations),
    sessions: mine(sessions),
    personalRecords: mine(personalRecords),
  };
}

export async function exportBackupToFile(): Promise<void> {
  const data = await buildBackup();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `myfittrack-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Substitui os dados da CONTA ATUAL pelos do backup (validado). Nunca afeta
 * dados de outros usuarios. Reassocia tudo ao usuario atual (userId) e enfileira
 * para sincronizacao.
 */
export async function restoreBackup(data: BackupData): Promise<void> {
  const uid = getCurrentUserId();
  if (!uid) throw new Error('Nenhum usuario autenticado');

  const stamp = <T extends { userId?: string | null }>(arr: T[]) =>
    arr.map((r) => ({ ...r, userId: uid }));

  const customExercises = stamp(data.exercises.filter((e) => e.isCustom));
  const workouts = stamp(data.workouts);
  const programs = stamp(data.programs);
  const periodizations = stamp(data.periodizations);
  const sessions = stamp(data.sessions);
  const personalRecords = stamp(data.personalRecords);
  const settings = data.settings ? { ...data.settings, id: uid, userId: uid } : null;

  const [oldExercises, oldWorkouts, oldPrograms, oldPeriodizations, oldSessions, oldRecords] =
    await Promise.all([
      db.exercises.where('userId').equals(uid).toArray(),
      db.workouts.where('userId').equals(uid).toArray(),
      db.programs.where('userId').equals(uid).toArray(),
      db.periodizations.where('userId').equals(uid).toArray(),
      db.sessions.where('userId').equals(uid).toArray(),
      db.personalRecords.where('userId').equals(uid).toArray(),
    ]);

  await db.transaction(
    'rw',
    [db.settings, db.exercises, db.workouts, db.programs, db.periodizations, db.sessions, db.personalRecords],
    async () => {
      await db.workouts.where('userId').equals(uid).delete();
      await db.programs.where('userId').equals(uid).delete();
      await db.periodizations.where('userId').equals(uid).delete();
      await db.sessions.where('userId').equals(uid).delete();
      await db.personalRecords.where('userId').equals(uid).delete();
      await db.exercises.where('userId').equals(uid).delete(); // apenas custom
      if (settings) await db.settings.put(settings);
      if (customExercises.length) await db.exercises.bulkPut(customExercises);
      if (workouts.length) await db.workouts.bulkPut(workouts);
      if (programs.length) await db.programs.bulkPut(programs);
      if (periodizations.length) await db.periodizations.bulkPut(periodizations);
      if (sessions.length) await db.sessions.bulkPut(sessions);
      if (personalRecords.length) await db.personalRecords.bulkPut(personalRecords);
    },
  );

  // Tombstones para entidades que existiam antes, mas nao vieram no backup.
  // Sem isso, um pull futuro traria de volta dados removidos pela restauracao.
  const enqueueRemoved = async (
    type: Parameters<typeof enqueue>[0],
    oldIds: string[],
    newIds: string[],
  ) => {
    const keep = new Set(newIds);
    for (const id of oldIds) if (!keep.has(id)) await enqueue(type, id, 'delete', { id });
  };
  await enqueueRemoved('customExercise', oldExercises.map((e) => e.id), customExercises.map((e) => e.id));
  await enqueueRemoved('workout', oldWorkouts.map((e) => e.id), workouts.map((e) => e.id));
  await enqueueRemoved('program', oldPrograms.map((e) => e.id), programs.map((e) => e.id));
  await enqueueRemoved('periodization', oldPeriodizations.map((e) => e.id), periodizations.map((e) => e.id));
  await enqueueRemoved('session', oldSessions.map((e) => e.id), sessions.map((e) => e.id));
  await enqueueRemoved('personalRecord', oldRecords.map((e) => e.id), personalRecords.map((e) => e.id));

  // Enfileira os dados restaurados para a nuvem (no-op em modo local).
  if (settings) await enqueue('settings', settings.id, 'upsert', settings);
  for (const e of customExercises) await enqueue('customExercise', e.id, 'upsert', e);
  for (const w of workouts) await enqueue('workout', w.id, 'upsert', w);
  for (const p of programs) await enqueue('program', p.id, 'upsert', p);
  for (const p of periodizations) await enqueue('periodization', p.id, 'upsert', p);
  for (const s of sessions) await enqueue('session', s.id, 'upsert', s);
  for (const r of personalRecords) await enqueue('personalRecord', r.id, 'upsert', r);
}

/** Mescla o backup na conta atual sem remover entidades que ja existem. */
export async function mergeBackup(data: BackupData): Promise<void> {
  const uid = getCurrentUserId();
  if (!uid) throw new Error('Nenhum usuario autenticado');
  const stamp = <T extends { userId?: string | null }>(rows: T[]) => rows.map((row) => ({ ...row, userId: uid }));
  const exercises = stamp(data.exercises.filter((exercise) => exercise.isCustom));
  const workouts = stamp(data.workouts);
  const programs = stamp(data.programs);
  const periods = stamp(data.periodizations);
  const sessions = stamp(data.sessions);
  const records = stamp(data.personalRecords);
  const currentSettings = await db.settings.get(uid);
  const incomingSettings = data.settings
    ? {
        ...currentSettings,
        ...data.settings,
        id: uid,
        userId: uid,
        favoriteExerciseIds: Array.from(new Set([
          ...(currentSettings?.favoriteExerciseIds ?? []),
          ...((data.settings as { favoriteExerciseIds?: string[] }).favoriteExerciseIds ?? []),
        ])),
      }
    : null;

  await db.transaction(
    'rw',
    [db.settings, db.exercises, db.workouts, db.programs, db.periodizations, db.sessions, db.personalRecords],
    async () => {
      if (incomingSettings) await db.settings.put(incomingSettings);
      if (exercises.length) await db.exercises.bulkPut(exercises);
      if (workouts.length) await db.workouts.bulkPut(workouts);
      if (programs.length) await db.programs.bulkPut(programs);
      if (periods.length) await db.periodizations.bulkPut(periods);
      if (sessions.length) await db.sessions.bulkPut(sessions);
      if (records.length) await db.personalRecords.bulkPut(records);
    },
  );

  if (incomingSettings) await enqueue('settings', uid, 'upsert', incomingSettings);
  for (const entity of exercises) await enqueue('customExercise', entity.id, 'upsert', entity);
  for (const entity of workouts) await enqueue('workout', entity.id, 'upsert', entity);
  for (const entity of programs) await enqueue('program', entity.id, 'upsert', entity);
  for (const entity of periods) await enqueue('periodization', entity.id, 'upsert', entity);
  for (const entity of sessions) await enqueue('session', entity.id, 'upsert', entity);
  for (const entity of records) await enqueue('personalRecord', entity.id, 'upsert', entity);
}

export function parseBackupFile(text: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false as const, error: 'Arquivo nao e um JSON valido.' };
  }
  return validateBackup(raw);
}

/** Cria um snapshot interno (automatico por padrao) e faz o prune. */
export async function createSnapshot(label: string, auto = true): Promise<void> {
  const data = await buildBackup();
  const snap: BackupSnapshot = {
    id: uuid(),
    createdAt: nowISO(),
    label,
    payload: JSON.stringify(data),
    auto,
  };
  await backupRepo.add(snap);
  if (auto) await backupRepo.pruneAuto(MAX_AUTO_SNAPSHOTS);
}

export async function restoreSnapshot(id: string): Promise<boolean> {
  const snap = await db.backups.get(id);
  if (!snap) return false;
  const result = parseBackupFile(snap.payload);
  if (!result.ok) return false;
  await restoreBackup(result.data);
  return true;
}
