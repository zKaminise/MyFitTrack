// Modelo de dominio do MyFitTrack.
// Todas as entidades importantes usam UUID e timestamps para facilitar
// backup, restauracao e uma eventual sincronizacao futura.

export type ID = string;
export type ISODate = string; // ex: "2026-08-25"
export type ISODateTime = string; // ex: "2026-08-25T07:35:00.000Z"

export type WeightUnit = 'kg' | 'lb';
export type ThemeMode = 'dark' | 'light' | 'system';
export type IntensityMetric = 'none' | 'rir' | 'rpe';

export type MuscleGroup =
  | 'peito'
  | 'costas'
  | 'quadriceps'
  | 'posterior'
  | 'gluteos'
  | 'ombros'
  | 'biceps'
  | 'triceps'
  | 'panturrilha'
  | 'abdomen'
  | 'lombar'
  | 'trapezio'
  | 'antebraco'
  | 'cardio'
  | 'corpo-inteiro';

export type Equipment =
  | 'maquina'
  | 'barra'
  | 'halteres'
  | 'polia'
  | 'smith'
  | 'peso-corporal'
  | 'elastico'
  | 'kettlebell'
  | 'banco'
  | 'sem-equipamento';

export type SetType =
  | 'normal'
  | 'aquecimento'
  | 'ajuste'
  | 'trabalho'
  | 'drop-set'
  | 'rest-pause'
  | 'amrap'
  | 'falha'
  | 'preparacao';

export interface WithMeta {
  id: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime | null;
}

/** Entidades que pertencem a um usuario (isolamento por conta).
 *  `userId` ausente/null = dado global (ex: biblioteca oficial) ou legado
 *  ainda nao associado a uma conta. */
export interface Ownable {
  userId?: string | null;
}

export type MediaType = 'gif' | 'video' | 'image' | 'none';

/** Metadados de midia de um exercicio (nunca embute o binario). */
export interface ExerciseMedia {
  type: MediaType;
  /** URL remota (ex: raw.githubusercontent do free-exercise-db). */
  remoteUrl?: string | null;
  /** URLs remotas adicionais (ex: posicao inicial/final). */
  remoteUrls?: string[];
  /** Reservado para midia local futura (data URL / blob). */
  localUrl?: string | null;
  source?: string | null; // ex: "free-exercise-db"
  sourceExerciseId?: string | null;
}

/** Exercicio (biblioteca embutida ou personalizado do usuario).
 *  `name` e o nome em pt-BR (namePtBr). `aliases` inclui termos em ingles para busca. */
export interface Exercise extends WithMeta, Ownable {
  name: string;
  aliases: string[];
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  /** Instrucoes legadas (texto unico). Preferir `instructionsList`. */
  instructions?: string;
  /** Passos de execucao (pt-BR quando disponivel, senao da fonte externa). */
  instructionsList?: string[];
  /** Regiao corporal (ex: "chest", "upper legs") vinda do enriquecimento. */
  bodyPart?: string | null;
  /** Metadados de midia. Legado `mediaUrl` ainda aceito para compatibilidade. */
  media?: ExerciseMedia;
  mediaUrl?: string | null; // legado (imagem/gif/video opcional)
  isCustom: boolean;
  isFavorite: boolean;
  /** Alternativas preferidas (ids de exercicios) para "substituir somente hoje". */
  alternativeIds: ID[];
  /** Publicacao opcional de um exercicio autoral no catalogo compartilhado. */
  visibility?: 'private' | 'community';
  authorId?: ID | null;
  authorName?: string | null;
  sourceExerciseId?: ID | null;
  pendingPublication?: boolean;
}

/** Prescricao de uma serie individual dentro do template. */
export interface SetPrescription {
  id: ID;
  order: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  setType: SetType;
  targetRir?: number | null;
  targetRpe?: number | null;
  /** Pausa interna da tecnica, ex.: rest-pause de 10 segundos. */
  intraSetRestSeconds?: number | null;
  notes?: string;
}

/** Configuracao de um exercicio dentro de um template de treino. */
export interface WorkoutExercise {
  id: ID;
  exerciseId: ID;
  order: number;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  setType: SetType;
  targetRir?: number | null;
  targetRpe?: number | null;
  notes?: string;
  /** Exercicios agrupados em superset compartilham o mesmo supersetId. */
  supersetId?: ID | null;
  /** Quando presente, cada serie usa sua propria meta/tipo/descanso. */
  setPrescriptions?: SetPrescription[];
}

/** Template de treino (Treino A, B, C...). */
export interface Workout extends WithMeta, Ownable {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  estimatedMinutes?: number;
  notes?: string;
  archived: boolean;
  exercises: WorkoutExercise[];
}

export type ScheduleType = 'fixed' | 'cycle';

/** Item de um dia fixo da semana (0=Dom .. 6=Sab). */
export interface FixedDay {
  weekday: number; // 0-6
  /** null = descanso */
  workoutId: ID | null;
}

/** Item de um ciclo continuo rotativo. */
export interface CycleItem {
  id: ID;
  order: number;
  /** null = descanso */
  workoutId: ID | null;
}

/** Reposicionamento pontual do ciclo, válido desta data em diante. */
export interface CycleAdjustment {
  id: ID;
  effectiveDate: ISODate;
  /** Item escolhido no ciclo; o índice serve de fallback se ele for removido. */
  cycleItemId: ID;
  cycleIndex: number;
  /** Offset acumulado no momento do ajuste, para preservar o calendário anterior. */
  cycleOffsetAtStart: number;
  createdAt: ISODateTime;
}

export type MissedPolicy = 'keep-calendar' | 'shift-cycle';

/** Programa ativo: define como o treino de cada dia e determinado. */
export interface Program extends WithMeta, Ownable {
  name: string;
  scheduleType: ScheduleType;
  /** Data de inicio do ciclo (ancora), usada para calcular a posicao rotativa. */
  cycleAnchorDate: ISODate;
  fixedDays: FixedDay[];
  cycleItems: CycleItem[];
  missedPolicy: MissedPolicy;
  /** Deslocamento acumulado do ciclo por treinos perdidos/pausas. */
  cycleOffset: number;
  /** Ajustes manuais de posição sem reescrever dias anteriores. */
  cycleAdjustments?: CycleAdjustment[];
  /** Ultima data processada para deteccao de treinos perdidos (ciclo shift). */
  lastAdvancedDate?: ISODate | null;
  paused: boolean;
  pausedAt?: ISODateTime | null;
  /** Periodizacao opcional aplicada. */
  periodizationId?: ID | null;
  /** Data em que a periodizacao comecou (para saber a semana atual). */
  periodizationStartDate?: ISODate | null;
  active: boolean;
}

export type ScheduleOverrideType = 'replace' | 'swap' | 'rest';

/** Alteracao manual aplicada apenas a uma data, sem modificar o programa base. */
export interface ScheduleOverride extends WithMeta, Ownable {
  programId: ID;
  date: ISODate;
  type: ScheduleOverrideType;
  originalWorkoutId: ID | null;
  overrideWorkoutId: ID | null;
  pairedOverrideId?: ID | null;
  reason?: string;
}

export interface PeriodizationWeek {
  id: ID;
  order: number;
  name: string; // ex: "Leve", "Deload"
  repMin: number;
  repMax: number;
  intensityPct: number; // referencia relativa (%)
  setsDelta: number; // ajuste no numero de series (+/-)
  targetRir?: number | null;
  targetRpe?: number | null;
  restSeconds?: number | null;
  isDeload: boolean;
}

export interface Periodization extends WithMeta, Ownable {
  name: string;
  weeks: PeriodizationWeek[];
}

// ---------- Historico (imutavel) ----------

export interface SetLog {
  id: ID;
  setIndex: number; // 1-based
  setType: SetType;
  weight: number | null;
  reps: number | null;
  targetRir?: number | null;
  targetRpe?: number | null;
  targetRepMin?: number | null;
  targetRepMax?: number | null;
  restSeconds?: number | null;
  intraSetRestSeconds?: number | null;
  prescriptionNotes?: string;
  completed: boolean;
  completedAt?: ISODateTime | null;
}

export type ExerciseStatus = 'planned' | 'completed' | 'skipped';

/** Snapshot de um exercicio executado numa sessao. */
export interface SessionExercise {
  id: ID;
  order: number;
  /** Exercicio planejado pelo template. */
  plannedExerciseId: ID;
  /** Exercicio realmente executado (diferente se houve substituicao). */
  performedExerciseId: ID;
  /** Nome congelado no momento da sessao (historico imutavel). */
  plannedExerciseName: string;
  performedExerciseName: string;
  status: ExerciseStatus;
  substituted: boolean;
  reason?: string; // motivo opcional de pular/substituir
  targetSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  notes?: string;
  supersetId?: ID | null;
  sets: SetLog[];
}

export type SessionStatus = 'active' | 'completed' | 'discarded';
export type PerceivedEffort = 'muito-leve' | 'leve' | 'normal' | 'dificil' | 'muito-dificil';

/** Sessao de treino. Guarda snapshot suficiente para ser imutavel. */
export interface Session extends WithMeta, Ownable {
  workoutId: ID | null; // template de origem (referencia)
  /** O que estava efetivamente programado para a data, antes da execucao. */
  scheduledWorkoutId?: ID | null;
  scheduledWorkoutName?: string | null;
  /** Template realmente escolhido para a sessao. */
  performedWorkoutId?: ID | null;
  scheduleSource?: 'scheduled' | 'override' | 'swap' | 'extra' | 'manual';
  scheduleOverrideId?: ID | null;
  workoutName: string; // congelado
  workoutDescription?: string;
  programId?: ID | null;
  scheduleType?: ScheduleType;
  date: ISODate;
  startedAt: ISODateTime;
  endedAt?: ISODateTime | null;
  status: SessionStatus;
  exercises: SessionExercise[];
  perceivedEffort?: PerceivedEffort | null;
  note?: string;
  periodizationWeekName?: string | null;
}

export type PersonalRecordType = 'max-weight' | 'max-reps-at-weight' | 'max-volume' | 'best-1rm';

export interface PersonalRecord extends WithMeta, Ownable {
  exerciseId: ID;
  type: PersonalRecordType;
  value: number;
  weight?: number | null;
  reps?: number | null;
  sessionId: ID;
  date: ISODate;
}

export interface Settings extends Ownable {
  /** id = userId do dono (ou 'local-legacy' para dados antigos pre-conta). */
  id: string;
  theme: ThemeMode;
  unit: WeightUnit;
  intensityMetric: IntensityMetric;
  defaultRestSeconds: number;
  autoStartTimer: boolean;
  vibration: boolean;
  sound: boolean;
  progressionThresholdPct: number; // 50 | 75 | 100 | custom
  useDoubleProgression: boolean;
  missedBreaksStreak: boolean;
  onboarded: boolean;
  /** Favoritos por usuario (a biblioteca oficial e compartilhada). */
  favoriteExerciseIds: string[];
  updatedAt: ISODateTime;
}

// ---------- Alimentacao ----------

export interface NutrientValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
}

export type FoodSource = 'open-food-facts' | 'usda' | 'manual';
export type FoodUnit = 'g' | 'ml' | 'unidade' | 'porcao';

/** Formato normalizado usado por qualquer provider nutricional. */
export interface FoodReference {
  id: ID;
  source: FoodSource;
  sourceId: string;
  name: string;
  brand?: string | null;
  servingSize?: number | null;
  servingUnit?: FoodUnit | null;
  servingWeightGrams?: number | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g?: number | null;
}

/** Cache local de resultados externos. Nao e dado pessoal nem sincronizado. */
export interface FoodCacheEntry extends WithMeta {
  food: FoodReference;
  normalizedSearch: string;
}

export interface UserFood extends WithMeta, Ownable, FoodReference {
  source: 'manual';
}

export interface MealSlot {
  id: ID;
  name: string;
  order: number;
}

export interface NutritionSettings extends WithMeta, Ownable {
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget?: number | null;
  mealSlots: MealSlot[];
  favoriteFoodIds: ID[];
  recentFoodIds: ID[];
}

export interface SavedMealItem {
  id: ID;
  food: FoodReference;
  quantity: number;
  unit: FoodUnit;
  nutrients: NutrientValues;
}

export interface SavedMeal extends WithMeta, Ownable {
  name: string;
  items: SavedMealItem[];
}

export type FoodLogStatus = 'planned' | 'consumed';

/** Snapshot imutavel do que foi planejado/consumido em um dia alimentar. */
export interface FoodLogItem {
  id: ID;
  mealSlotId: ID;
  kind: 'food' | 'saved-meal';
  sourceId: ID;
  nameSnapshot: string;
  brandSnapshot?: string | null;
  quantity: number;
  unit: FoodUnit;
  status: FoodLogStatus;
  nutrients: NutrientValues;
  components?: SavedMealItem[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface NutritionDay extends WithMeta, Ownable {
  date: ISODate;
  items: FoodLogItem[];
}

// ---------- Autenticacao local (fallback sem Supabase) ----------

/** Conta local (armazenada no IndexedDB quando o Supabase nao esta configurado). */
export interface LocalUser {
  id: ID;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: ISODateTime;
}

// ---------- Fila de sincronizacao ----------

export type SyncEntityType =
  | 'workout'
  | 'program'
  | 'periodization'
  | 'session'
  | 'personalRecord'
  | 'customExercise'
  | 'settings'
  | 'scheduleOverride'
  | 'nutritionSettings'
  | 'userFood'
  | 'savedMeal'
  | 'nutritionDay'
  | 'communityExercise';

export type SyncOperation = 'upsert' | 'delete';
export type SyncItemStatus = 'pending' | 'syncing' | 'error';

export interface SyncQueueItem {
  id: ID;
  userId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: unknown;
  createdAt: ISODateTime;
  retryCount: number;
  status: SyncItemStatus;
  lastError?: string;
}

/** Metadados de sync por usuario. id = userId. */
export interface SyncMeta {
  id: string;
  lastPulledAt: ISODateTime | null;
}

export interface BackupSnapshot extends Ownable {
  id: ID;
  createdAt: ISODateTime;
  label: string;
  payload: string; // JSON serializado do BackupData
  auto: boolean;
}

/** Estrutura completa de um backup exportavel. */
export interface BackupData {
  /** `fit-system-2` e aceito apenas para restaurar backups antigos. */
  format: 'myfittrack' | 'fit-system-2';
  version: number;
  exportedAt: ISODateTime;
  settings: Settings | null;
  exercises: Exercise[];
  workouts: Workout[];
  programs: Program[];
  periodizations: Periodization[];
  sessions: Session[];
  personalRecords: PersonalRecord[];
  scheduleOverrides: ScheduleOverride[];
  nutritionSettings: NutritionSettings[];
  userFoods: UserFood[];
  savedMeals: SavedMeal[];
  nutritionDays: NutritionDay[];
}
