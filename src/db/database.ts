// Banco local IndexedDB via Dexie.
import Dexie, { type Table } from 'dexie';
import type {
  Exercise,
  Workout,
  Program,
  Periodization,
  Session,
  PersonalRecord,
  Settings,
  BackupSnapshot,
  LocalUser,
  SyncQueueItem,
  SyncMeta,
  ScheduleOverride,
  NutritionSettings,
  UserFood,
  SavedMeal,
  NutritionDay,
  FoodCacheEntry,
} from '@/domain/types';

/** Marcador de dados criados antes da introducao de contas (fase local-only). */
export const LEGACY_USER_ID = 'local-legacy';

export class FitDatabase extends Dexie {
  settings!: Table<Settings, string>;
  exercises!: Table<Exercise, string>;
  workouts!: Table<Workout, string>;
  programs!: Table<Program, string>;
  periodizations!: Table<Periodization, string>;
  sessions!: Table<Session, string>;
  personalRecords!: Table<PersonalRecord, string>;
  backups!: Table<BackupSnapshot, string>;
  users!: Table<LocalUser, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  syncMeta!: Table<SyncMeta, string>;
  scheduleOverrides!: Table<ScheduleOverride, string>;
  nutritionSettings!: Table<NutritionSettings, string>;
  userFoods!: Table<UserFood, string>;
  savedMeals!: Table<SavedMeal, string>;
  nutritionDays!: Table<NutritionDay, string>;
  foodCache!: Table<FoodCacheEntry, string>;
  communityExercises!: Table<Exercise, string>;

  constructor() {
    super('fit-system-2');

    // v1 — esquema original (fase local-only).
    this.version(1).stores({
      settings: 'id',
      exercises: 'id, name, primaryMuscle, equipment, isCustom, isFavorite',
      workouts: 'id, name, archived',
      programs: 'id, active',
      periodizations: 'id',
      sessions: 'id, date, workoutId, status, startedAt',
      personalRecords: 'id, exerciseId, type, date',
      backups: 'id, createdAt, auto',
    });

    // v2 — multiusuario: userId nas entidades, contas locais e fila de sync.
    this.version(2)
      .stores({
        settings: 'id, userId',
        exercises: 'id, name, primaryMuscle, equipment, isCustom, userId',
        workouts: 'id, userId, name, archived',
        programs: 'id, userId, active',
        periodizations: 'id, userId',
        sessions: 'id, userId, date, workoutId, status, startedAt',
        personalRecords: 'id, userId, exerciseId, type, date',
        backups: 'id, createdAt, auto, userId',
        users: 'id, &email',
        syncQueue: 'id, userId, status, createdAt',
        syncMeta: 'id',
      })
      .upgrade(async (tx) => {
        const stamp = async (name: string) => {
          await tx
            .table(name)
            .toCollection()
            .modify((r: { userId?: string | null }) => {
              if (r.userId === undefined || r.userId === null) r.userId = LEGACY_USER_ID;
            });
        };
        await stamp('workouts');
        await stamp('programs');
        await stamp('periodizations');
        await stamp('sessions');
        await stamp('personalRecords');

        // Exercicios: apenas os personalizados pertencem ao usuario legado.
        const favoriteIds: string[] = [];
        await tx
          .table('exercises')
          .toCollection()
          .modify((r: { isCustom?: boolean; isFavorite?: boolean; userId?: string | null; id: string }) => {
            if (r.isFavorite) favoriteIds.push(r.id);
            if (r.isCustom && (r.userId === undefined || r.userId === null)) r.userId = LEGACY_USER_ID;
          });

        // Configuracoes: singleton -> conta legada, migrando favoritos.
        const legacySettings = await tx.table('settings').get('singleton');
        if (legacySettings) {
          await tx.table('settings').put({
            ...legacySettings,
            id: LEGACY_USER_ID,
            userId: LEGACY_USER_ID,
            favoriteExerciseIds: legacySettings.favoriteExerciseIds ?? favoriteIds,
          });
          await tx.table('settings').delete('singleton');
        }
      });

    // v3 — calendario flexivel e alimentacao local-first. Apenas adiciona
    // stores; nenhum dado existente de treino e regravado ou removido.
    this.version(3).stores({
      settings: 'id, userId',
      exercises: 'id, name, primaryMuscle, equipment, isCustom, userId',
      workouts: 'id, userId, name, archived',
      programs: 'id, userId, active',
      periodizations: 'id, userId',
      sessions: 'id, userId, date, workoutId, status, startedAt',
      personalRecords: 'id, userId, exerciseId, type, date',
      backups: 'id, createdAt, auto, userId',
      users: 'id, &email',
      syncQueue: 'id, userId, status, createdAt',
      syncMeta: 'id',
      scheduleOverrides: 'id, userId, programId, date, type',
      nutritionSettings: 'id, userId',
      userFoods: 'id, userId, name, sourceId',
      savedMeals: 'id, userId, name',
      nutritionDays: 'id, userId, date',
      foodCache: 'id, normalizedSearch, updatedAt',
    });

    // v4 — catalogo comunitario separado dos exercicios privados/oficiais.
    this.version(4).stores({
      settings: 'id, userId', exercises: 'id, name, primaryMuscle, equipment, isCustom, userId',
      workouts: 'id, userId, name, archived', programs: 'id, userId, active',
      periodizations: 'id, userId', sessions: 'id, userId, date, workoutId, status, startedAt',
      personalRecords: 'id, userId, exerciseId, type, date', backups: 'id, createdAt, auto, userId',
      users: 'id, &email', syncQueue: 'id, userId, status, createdAt', syncMeta: 'id',
      scheduleOverrides: 'id, userId, programId, date, type', nutritionSettings: 'id, userId',
      userFoods: 'id, userId, name, sourceId', savedMeals: 'id, userId, name',
      nutritionDays: 'id, userId, date', foodCache: 'id, normalizedSearch, updatedAt',
      communityExercises: 'id, name, primaryMuscle, equipment, authorId, updatedAt',
    });
  }
}

export const db = new FitDatabase();
