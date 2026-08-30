// Interfaces de repositorio. A UI depende destas abstracoes, nunca do Dexie
// diretamente. Futuramente uma CloudRepository pode implementar as mesmas
// interfaces sem reescrever telas.
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

export interface CrudRepository<T> {
  all(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  put(entity: T): Promise<void>;
  remove(id: string): Promise<void>;
}

export type ExerciseRepository = CrudRepository<Exercise>;
export type WorkoutRepository = CrudRepository<Workout>;
export type PeriodizationRepository = CrudRepository<Periodization>;
export type ScheduleOverrideRepository = CrudRepository<ScheduleOverride>;
export type NutritionSettingsRepository = CrudRepository<NutritionSettings>;
export type UserFoodRepository = CrudRepository<UserFood>;
export type SavedMealRepository = CrudRepository<SavedMeal>;
export type NutritionDayRepository = CrudRepository<NutritionDay>;
export type FoodCacheRepository = CrudRepository<FoodCacheEntry>;

export interface ProgramRepository extends CrudRepository<Program> {
  getActive(): Promise<Program | undefined>;
}

export interface SessionRepository extends CrudRepository<Session> {
  byStatus(status: Session['status']): Promise<Session[]>;
  byDate(date: string): Promise<Session[]>;
  active(): Promise<Session | undefined>;
}

export interface PersonalRecordRepository extends CrudRepository<PersonalRecord> {
  byExercise(exerciseId: string): Promise<PersonalRecord[]>;
}

export interface SettingsRepository {
  get(): Promise<Settings | undefined>;
  save(settings: Settings): Promise<void>;
}

export interface BackupRepository {
  all(): Promise<BackupSnapshot[]>;
  add(snapshot: BackupSnapshot): Promise<void>;
  remove(id: string): Promise<void>;
  /** Mantem no maximo `keep` snapshots automaticos, removendo os mais antigos. */
  pruneAuto(keep: number): Promise<void>;
}
