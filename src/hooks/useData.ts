// Hooks de leitura reativa do IndexedDB via dexie-react-hooks.
// Isolamento por usuario: cada consulta filtra pelo usuario atual e re-executa
// quando a conta muda (dependencia userId).
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Exercise } from '@/domain/types';
import { useCurrentUserId } from '@/store/authStore';

export function useWorkouts() {
  const uid = useCurrentUserId();
  return useLiveQuery(() => (uid ? db.workouts.where('userId').equals(uid).toArray() : []), [uid], []);
}

export function useWorkout(id: string | undefined) {
  const uid = useCurrentUserId();
  return useLiveQuery(async () => {
    if (!id) return undefined;
    const w = await db.workouts.get(id);
    return w && w.userId === uid ? w : undefined;
  }, [id, uid]);
}

export function useExercises() {
  const uid = useCurrentUserId();
  return useLiveQuery(
    async () => {
      const all = await db.exercises.toArray();
      return all.filter((e) => e.userId == null || e.userId === uid);
    },
    [uid],
    [],
  );
}

export function useExercise(id: string | undefined) {
  const uid = useCurrentUserId();
  return useLiveQuery(async () => {
    if (!id) return undefined;
    const e = await db.exercises.get(id);
    if (!e) return undefined;
    return e.userId == null || e.userId === uid ? e : undefined;
  }, [id, uid]);
}

export function useExerciseMap(): Map<string, Exercise> {
  const list = useExercises();
  return new Map((list ?? []).map((e) => [e.id, e]));
}

export function useActiveProgram() {
  const uid = useCurrentUserId();
  return useLiveQuery(
    async () => (uid ? (await db.programs.where('userId').equals(uid).toArray()).find((p) => p.active) : undefined),
    [uid],
    undefined,
  );
}

export function usePrograms() {
  const uid = useCurrentUserId();
  return useLiveQuery(() => (uid ? db.programs.where('userId').equals(uid).toArray() : []), [uid], []);
}

export function usePeriodizations() {
  const uid = useCurrentUserId();
  return useLiveQuery(() => (uid ? db.periodizations.where('userId').equals(uid).toArray() : []), [uid], []);
}

export function usePeriodization(id: string | null | undefined) {
  return useLiveQuery(() => (id ? db.periodizations.get(id) : undefined), [id]);
}

export function useSessions() {
  const uid = useCurrentUserId();
  return useLiveQuery(
    () => (uid ? db.sessions.where('userId').equals(uid).reverse().sortBy('startedAt') : []),
    [uid],
    [],
  );
}

export function useCompletedSessions() {
  const uid = useCurrentUserId();
  return useLiveQuery(
    async () =>
      uid
        ? (await db.sessions.where('userId').equals(uid).reverse().sortBy('startedAt')).filter(
            (s) => s.status === 'completed',
          )
        : [],
    [uid],
    [],
  );
}

export function useSession(id: string | undefined) {
  const uid = useCurrentUserId();
  return useLiveQuery(async () => {
    if (!id) return undefined;
    const s = await db.sessions.get(id);
    return s && s.userId === uid ? s : undefined;
  }, [id, uid]);
}

export function usePersonalRecords() {
  const uid = useCurrentUserId();
  return useLiveQuery(() => (uid ? db.personalRecords.where('userId').equals(uid).toArray() : []), [uid], []);
}

export function useBackups() {
  const uid = useCurrentUserId();
  return useLiveQuery(
    async () => {
      const all = await db.backups.orderBy('createdAt').reverse().toArray();
      return all.filter((b) => b.userId == null || b.userId === uid);
    },
    [uid],
    [],
  );
}

export function useScheduleOverrides() {
  const uid = useCurrentUserId();
  return useLiveQuery(
    () => (uid ? db.scheduleOverrides.where('userId').equals(uid).toArray() : []),
    [uid],
    [],
  );
}

export function useNutritionSettings() {
  const uid = useCurrentUserId();
  return useLiveQuery(
    async () => (uid ? db.nutritionSettings.get(uid) : undefined),
    [uid],
    undefined,
  );
}

export function useUserFoods() {
  const uid = useCurrentUserId();
  return useLiveQuery(
    () => (uid ? db.userFoods.where('userId').equals(uid).toArray() : []),
    [uid],
    [],
  );
}

export function useSavedMeals() {
  const uid = useCurrentUserId();
  return useLiveQuery(
    () => (uid ? db.savedMeals.where('userId').equals(uid).toArray() : []),
    [uid],
    [],
  );
}

export function useNutritionDays() {
  const uid = useCurrentUserId();
  return useLiveQuery(
    () => (uid ? db.nutritionDays.where('userId').equals(uid).toArray() : []),
    [uid],
    [],
  );
}

export function useNutritionDay(date: string) {
  const uid = useCurrentUserId();
  return useLiveQuery(
    async () => {
      if (!uid) return undefined;
      return db.nutritionDays.where('userId').equals(uid).filter((day) => day.date === date).first();
    },
    [uid, date],
    undefined,
  );
}
