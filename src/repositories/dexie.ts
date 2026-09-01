// Implementacoes Dexie das interfaces de repositorio.
// Isolamento por usuario: leituras filtram pelo usuario atual; escritas carimbam
// userId e enfileiram operacao de sync (no-op em modo local).
import { db } from '@/db/database';
import { getCurrentUserId } from './context';
import { enqueue } from '@/sync/queue';
import type {
  Exercise,
  Workout,
  Program,
  Periodization,
  Session,
  PersonalRecord,
  Settings,
  BackupSnapshot,
  ScheduleOverride,
  NutritionSettings,
  UserFood,
  SavedMeal,
  NutritionDay,
  FoodCacheEntry,
} from '@/domain/types';
import type {
  ExerciseRepository,
  WorkoutRepository,
  ProgramRepository,
  PeriodizationRepository,
  SessionRepository,
  PersonalRecordRepository,
  SettingsRepository,
  BackupRepository,
  ScheduleOverrideRepository,
  NutritionSettingsRepository,
  UserFoodRepository,
  SavedMealRepository,
  NutritionDayRepository,
  FoodCacheRepository,
} from './interfaces';

const uid = getCurrentUserId;

/** Garante que a entidade lida pertence ao usuario atual (ou e global). */
function owned<T extends { userId?: string | null }>(e: T | undefined): T | undefined {
  if (!e) return undefined;
  if (e.userId == null) return e; // global (ex: biblioteca)
  return e.userId === uid() ? e : undefined;
}

export const exerciseRepo: ExerciseRepository = {
  all: async () => {
    const u = uid();
    const [all, community] = await Promise.all([db.exercises.toArray(), db.communityExercises.toArray()]);
    // Biblioteca oficial (userId null) + exercicios personalizados do usuario.
    const personal = all.filter((e) => e.userId == null || e.userId === u);
    return [...personal, ...community.filter((e) => e.authorId !== u)];
  },
  get: async (id) => owned((await db.exercises.get(id)) ?? (await db.communityExercises.get(id))),
  put: async (e: Exercise) => {
    const ent = e.isCustom ? { ...e, userId: e.userId ?? uid() } : e;
    await db.exercises.put(ent);
    if (ent.isCustom) {
      const cloudEnt = ent.media ? {
        ...ent,
        pendingPublication: false,
        media: {
          ...ent.media,
          localUrl: null,
          remoteUrl: ent.media.remoteUrl?.startsWith('http') ? ent.media.remoteUrl : null,
          remoteUrls: (ent.media.remoteUrls ?? []).filter((url) => url.startsWith('http')),
        },
      } : ent;
      await enqueue('customExercise', ent.id, 'upsert', cloudEnt);
    }
  },
  remove: async (id) => {
    const e = await db.exercises.get(id);
    await db.exercises.delete(id);
    if (e?.isCustom) await enqueue('customExercise', id, 'delete', { id });
  },
};

export const communityExerciseRepo = {
  all: async () => db.communityExercises.toArray(),
  get: async (id: string) => db.communityExercises.get(id),
  put: async (exercise: Exercise) => {
    await db.communityExercises.put({ ...exercise, userId: null, visibility: 'community' });
    await enqueue('communityExercise', exercise.id, 'upsert', exercise);
  },
  remove: async (id: string) => {
    await db.communityExercises.delete(id);
    await enqueue('communityExercise', id, 'delete', { id });
  },
};

export const workoutRepo: WorkoutRepository = {
  all: async () => (uid() ? db.workouts.where('userId').equals(uid()!).toArray() : []),
  get: async (id) => owned(await db.workouts.get(id)),
  put: async (w: Workout) => {
    const ent = { ...w, userId: w.userId ?? uid() };
    await db.workouts.put(ent);
    await enqueue('workout', ent.id, 'upsert', ent);
  },
  remove: async (id) => {
    await db.workouts.delete(id);
    await enqueue('workout', id, 'delete', { id });
  },
};

export const programRepo: ProgramRepository = {
  all: async () => (uid() ? db.programs.where('userId').equals(uid()!).toArray() : []),
  get: async (id) => owned(await db.programs.get(id)),
  put: async (p: Program) => {
    const ent = { ...p, userId: p.userId ?? uid() };
    await db.programs.put(ent);
    await enqueue('program', ent.id, 'upsert', ent);
  },
  remove: async (id) => {
    await db.programs.delete(id);
    await enqueue('program', id, 'delete', { id });
  },
  getActive: async () => {
    const u = uid();
    if (!u) return undefined;
    return (await db.programs.where('userId').equals(u).toArray()).find((p) => p.active);
  },
};

export const periodizationRepo: PeriodizationRepository = {
  all: async () => (uid() ? db.periodizations.where('userId').equals(uid()!).toArray() : []),
  get: async (id) => owned(await db.periodizations.get(id)),
  put: async (p: Periodization) => {
    const ent = { ...p, userId: p.userId ?? uid() };
    await db.periodizations.put(ent);
    await enqueue('periodization', ent.id, 'upsert', ent);
  },
  remove: async (id) => {
    await db.periodizations.delete(id);
    await enqueue('periodization', id, 'delete', { id });
  },
};

export const sessionRepo: SessionRepository = {
  all: async () =>
    uid() ? db.sessions.where('userId').equals(uid()!).reverse().sortBy('startedAt') : [],
  get: async (id) => owned(await db.sessions.get(id)),
  put: async (s: Session) => {
    const ent = { ...s, userId: s.userId ?? uid() };
    await db.sessions.put(ent);
    await enqueue('session', ent.id, 'upsert', ent);
  },
  remove: async (id) => {
    await db.sessions.delete(id);
    await enqueue('session', id, 'delete', { id });
  },
  byStatus: async (status) =>
    uid() ? db.sessions.where('userId').equals(uid()!).filter((s) => s.status === status).toArray() : [],
  byDate: async (date) =>
    uid() ? db.sessions.where('userId').equals(uid()!).filter((s) => s.date === date).toArray() : [],
  active: async () => {
    const u = uid();
    if (!u) return undefined;
    return (await db.sessions.where('userId').equals(u).toArray()).find((s) => s.status === 'active');
  },
};

export const personalRecordRepo: PersonalRecordRepository = {
  all: async () => (uid() ? db.personalRecords.where('userId').equals(uid()!).toArray() : []),
  get: async (id) => owned(await db.personalRecords.get(id)),
  put: async (r: PersonalRecord) => {
    const ent = { ...r, userId: r.userId ?? uid() };
    await db.personalRecords.put(ent);
    await enqueue('personalRecord', ent.id, 'upsert', ent);
  },
  remove: async (id) => {
    await db.personalRecords.delete(id);
    await enqueue('personalRecord', id, 'delete', { id });
  },
  byExercise: async (exerciseId) =>
    uid()
      ? db.personalRecords.where('userId').equals(uid()!).filter((r) => r.exerciseId === exerciseId).toArray()
      : [],
};

export const settingsRepo: SettingsRepository = {
  get: async () => {
    const u = uid();
    return u ? db.settings.get(u) : undefined;
  },
  save: async (s: Settings) => {
    const ent = { ...s, userId: s.id };
    await db.settings.put(ent);
    await enqueue('settings', ent.id, 'upsert', ent);
  },
};

export const backupRepo: BackupRepository = {
  all: async () => {
    const u = uid();
    const all = await db.backups.orderBy('createdAt').reverse().toArray();
    return all.filter((b) => b.userId == null || b.userId === u);
  },
  add: async (s: BackupSnapshot) => void (await db.backups.put({ ...s, userId: s.userId ?? uid() })),
  remove: async (id) => void (await db.backups.delete(id)),
  pruneAuto: async (keep) => {
    const u = uid();
    const autos = (await db.backups.toArray())
      .filter((b) => b.auto && (b.userId == null || b.userId === u))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    await db.backups.bulkDelete(autos.slice(keep).map((b) => b.id));
  },
};

export const scheduleOverrideRepo: ScheduleOverrideRepository = {
  all: async () => (uid() ? db.scheduleOverrides.where('userId').equals(uid()!).toArray() : []),
  get: async (id) => owned(await db.scheduleOverrides.get(id)),
  put: async (item: ScheduleOverride) => {
    const entity = { ...item, userId: item.userId ?? uid() };
    await db.scheduleOverrides.put(entity);
    await enqueue('scheduleOverride', entity.id, 'upsert', entity);
  },
  remove: async (id) => {
    await db.scheduleOverrides.delete(id);
    await enqueue('scheduleOverride', id, 'delete', { id });
  },
};

export const nutritionSettingsRepo: NutritionSettingsRepository = {
  all: async () => (uid() ? db.nutritionSettings.where('userId').equals(uid()!).toArray() : []),
  get: async (id) => owned(await db.nutritionSettings.get(id)),
  put: async (item: NutritionSettings) => {
    const entity = { ...item, userId: item.userId ?? uid() };
    await db.nutritionSettings.put(entity);
    await enqueue('nutritionSettings', entity.id, 'upsert', entity);
  },
  remove: async (id) => {
    await db.nutritionSettings.delete(id);
    await enqueue('nutritionSettings', id, 'delete', { id });
  },
};

export const userFoodRepo: UserFoodRepository = {
  all: async () => (uid() ? db.userFoods.where('userId').equals(uid()!).toArray() : []),
  get: async (id) => owned(await db.userFoods.get(id)),
  put: async (item: UserFood) => {
    const entity = { ...item, userId: item.userId ?? uid() };
    await db.userFoods.put(entity);
    await enqueue('userFood', entity.id, 'upsert', entity);
  },
  remove: async (id) => {
    await db.userFoods.delete(id);
    await enqueue('userFood', id, 'delete', { id });
  },
};

export const savedMealRepo: SavedMealRepository = {
  all: async () => (uid() ? db.savedMeals.where('userId').equals(uid()!).toArray() : []),
  get: async (id) => owned(await db.savedMeals.get(id)),
  put: async (item: SavedMeal) => {
    const entity = { ...item, userId: item.userId ?? uid() };
    await db.savedMeals.put(entity);
    await enqueue('savedMeal', entity.id, 'upsert', entity);
  },
  remove: async (id) => {
    await db.savedMeals.delete(id);
    await enqueue('savedMeal', id, 'delete', { id });
  },
};

export const nutritionDayRepo: NutritionDayRepository = {
  all: async () => (uid() ? db.nutritionDays.where('userId').equals(uid()!).toArray() : []),
  get: async (id) => owned(await db.nutritionDays.get(id)),
  put: async (item: NutritionDay) => {
    const entity = { ...item, userId: item.userId ?? uid() };
    await db.nutritionDays.put(entity);
    await enqueue('nutritionDay', entity.id, 'upsert', entity);
  },
  remove: async (id) => {
    await db.nutritionDays.delete(id);
    await enqueue('nutritionDay', id, 'delete', { id });
  },
};

export const foodCacheRepo: FoodCacheRepository = {
  all: async () => db.foodCache.toArray(),
  get: async (id) => db.foodCache.get(id),
  put: async (item: FoodCacheEntry) => void (await db.foodCache.put(item)),
  remove: async (id) => void (await db.foodCache.delete(id)),
};
