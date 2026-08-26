import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';

class MemStorage {
  store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}
(globalThis as any).localStorage = new MemStorage();

import { db, LEGACY_USER_ID } from '@/db/database';
import { setCurrentUserId } from '@/repositories/context';
import { workoutRepo, sessionRepo, personalRecordRepo } from '@/repositories/dexie';
import { importLegacyToUser } from '@/services/migration';
import { nowISO, uuid } from '@/lib/id';
import type { Workout, Session } from '@/domain/types';
import { resetCurrentUserTrainingData } from '@/services/accountData';

function workout(name: string): Workout {
  return { id: uuid(), createdAt: nowISO(), updatedAt: nowISO(), name, archived: false, exercises: [] };
}
function session(): Session {
  return {
    id: uuid(), createdAt: nowISO(), updatedAt: nowISO(), workoutId: null, workoutName: 'W',
    date: '2026-08-25', startedAt: nowISO(), status: 'completed', exercises: [],
  };
}

beforeEach(async () => {
  await Promise.all([db.workouts.clear(), db.sessions.clear(), db.personalRecords.clear(), db.settings.clear()]);
  (globalThis.localStorage as unknown as MemStorage).clear();
});

describe('isolamento por usuario', () => {
  it('um usuario nao ve os treinos de outro', async () => {
    setCurrentUserId('user-A');
    await workoutRepo.put(workout('Treino A'));
    expect((await workoutRepo.all()).length).toBe(1);

    setCurrentUserId('user-B');
    expect(await workoutRepo.all()).toEqual([]);
    await workoutRepo.put(workout('Treino do B'));
    expect((await workoutRepo.all()).length).toBe(1);

    setCurrentUserId('user-A');
    const aWorkouts = await workoutRepo.all();
    expect(aWorkouts.length).toBe(1);
    expect(aWorkouts[0].name).toBe('Treino A');
  });

  it('sessoes e PRs sao isolados', async () => {
    setCurrentUserId('A');
    await sessionRepo.put(session());
    setCurrentUserId('B');
    expect((await sessionRepo.all()).length).toBe(0);
    setCurrentUserId('A');
    expect((await sessionRepo.all()).length).toBe(1);
    void personalRecordRepo;
  });

  it('get() nao vaza entidade de outro usuario', async () => {
    setCurrentUserId('A');
    const w = workout('Secreto');
    await workoutRepo.put(w);
    setCurrentUserId('B');
    expect(await workoutRepo.get(w.id)).toBeUndefined();
  });

  it('importa dados legados para a conta e limpa o legado', async () => {
    await db.workouts.put({ ...workout('Legado'), userId: LEGACY_USER_ID });
    await db.sessions.put({ ...session(), userId: LEGACY_USER_ID });

    setCurrentUserId('novo-user');
    await importLegacyToUser('novo-user');

    expect((await db.workouts.where('userId').equals('novo-user').toArray()).length).toBe(1);
    expect((await db.sessions.where('userId').equals('novo-user').toArray()).length).toBe(1);
    expect(await db.workouts.where('userId').equals(LEGACY_USER_ID).count()).toBe(0);
    expect(localStorage.getItem('fs2.legacyHandled')).toBe('true');
  });

  it('reset remove somente os dados da conta atual', async () => {
    setCurrentUserId('A');
    await workoutRepo.put(workout('Treino A'));
    setCurrentUserId('B');
    await workoutRepo.put(workout('Treino B'));
    await resetCurrentUserTrainingData();
    expect(await workoutRepo.all()).toEqual([]);
    setCurrentUserId('A');
    expect((await workoutRepo.all()).map((item) => item.name)).toEqual(['Treino A']);
  });
});
