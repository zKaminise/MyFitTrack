// Bootstrap do banco: garante configuracoes padrao e a biblioteca de exercicios.
// O programa de exemplo e opcional (carregado a pedido do usuario).
import { db } from './database';
import { EXERCISE_LIBRARY, type ExerciseSeed } from '@/data/exerciseLibrary';
import { EXERCISE_ENRICHMENT } from '@/data/exerciseEnrichment';
import { INSTRUCTIONS_PT } from '@/data/instructionsPt';
import { uuid, nowISO } from '@/lib/id';
import type {
  Exercise,
  ExerciseMedia,
  Program,
  Settings,
  Workout,
  WorkoutExercise,
} from '@/domain/types';
import { todayISO } from '@/domain/dates';
import { workoutRepo, programRepo, settingsRepo } from '@/repositories/dexie';

export function defaultSettings(userId: string): Settings {
  return {
    id: userId,
    userId,
    theme: 'dark',
    unit: 'kg',
    intensityMetric: 'none',
    defaultRestSeconds: 90,
    autoStartTimer: true,
    vibration: true,
    sound: false,
    progressionThresholdPct: 75,
    useDoubleProgression: false,
    missedBreaksStreak: false,
    onboarded: false,
    favoriteExerciseIds: [],
    updatedAt: nowISO(),
  };
}

/** Aliases de busca: nossos + nome/en em ingles do enriquecimento. */
function buildAliases(seed: ExerciseSeed): string[] {
  const set = new Set<string>(seed.aliases.map((a) => a.trim()).filter(Boolean));
  if (seed.en) set.add(seed.en.toLowerCase());
  return [...set];
}

function buildMedia(slug: string): ExerciseMedia {
  const e = EXERCISE_ENRICHMENT[slug];
  if (!e || !e.images.length) return { type: 'none' };
  return {
    type: 'image',
    remoteUrl: e.images[0],
    remoteUrls: e.images,
    localUrl: null,
    source: e.source,
    sourceExerciseId: e.sourceExerciseId,
  };
}

function buildInstructions(slug: string): string[] | undefined {
  return INSTRUCTIONS_PT[slug];
}

function sameInstructions(current?: string[], next?: string[]): boolean {
  if (current === next) return true;
  if (!current || !next || current.length !== next.length) return false;
  return current.every((step, index) => step === next[index]);
}

/** Aplica os campos enriquecidos a um exercicio da biblioteca (nao custom). */
function applyEnrichment(seed: ExerciseSeed, base: Exercise): Exercise {
  const e = EXERCISE_ENRICHMENT[seed.slug];
  return {
    ...base,
    aliases: buildAliases(seed),
    primaryMuscle: seed.primaryMuscle,
    secondaryMuscles: seed.secondaryMuscles,
    equipment: seed.equipment,
    instructionsList: buildInstructions(seed.slug),
    bodyPart: e?.bodyPart ?? null,
    media: buildMedia(seed.slug),
    updatedAt: nowISO(),
  };
}

/**
 * Mapa slug -> id. Garante a biblioteca e aplica/atualiza o enriquecimento
 * (midia, aliases, instrucoes, bodyPart) de forma idempotente. Preserva dados
 * do usuario (favoritos, alternativas, id) e nao altera exercicios custom.
 */
export async function ensureLibrary(): Promise<Map<string, string>> {
  const existing = await db.exercises.toArray();
  const bySlug = new Map<string, string>();
  const byName = new Map(existing.map((e) => [e.name, e]));

  const toAdd: Exercise[] = [];
  const toUpdate: Exercise[] = [];
  for (const seed of EXERCISE_LIBRARY) {
    const found = byName.get(seed.name);
    if (found) {
      bySlug.set(seed.slug, found.id);
      if (!found.isCustom) {
        const enriched = applyEnrichment(seed, found);
        // So grava se algo relevante mudou (evita writes desnecessarios no boot).
        if (
          !found.media ||
          found.media.remoteUrl !== enriched.media?.remoteUrl ||
          (found.aliases?.length ?? 0) !== enriched.aliases.length ||
          !sameInstructions(found.instructionsList, enriched.instructionsList)
        ) {
          toUpdate.push(enriched);
        }
      }
      continue;
    }
    const id = uuid();
    bySlug.set(seed.slug, id);
    const base: Exercise = {
      id,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      name: seed.name,
      aliases: [],
      primaryMuscle: seed.primaryMuscle,
      secondaryMuscles: seed.secondaryMuscles,
      equipment: seed.equipment,
      instructions: seed.instructions,
      mediaUrl: null,
      isCustom: false,
      isFavorite: false,
      alternativeIds: [],
    };
    toAdd.push(applyEnrichment(seed, base));
  }
  if (toAdd.length) await db.exercises.bulkAdd(toAdd);
  if (toUpdate.length) await db.exercises.bulkPut(toUpdate);
  return bySlug;
}

export async function ensureSettings(userId: string): Promise<Settings> {
  const existing = await db.settings.get(userId);
  if (existing) {
    // Migracao suave: garante campos novos.
    if (!Array.isArray(existing.favoriteExerciseIds)) {
      const patched = { ...existing, favoriteExerciseIds: [] };
      await db.settings.put(patched);
      return patched;
    }
    return existing;
  }
  const s = defaultSettings(userId);
  await db.settings.put(s);
  return s;
}

/** Inicializacao chamada no boot do app (dados globais, independente de conta). */
export async function bootstrap(): Promise<void> {
  await ensureLibrary();
}

function we(
  exerciseId: string,
  order: number,
  sets: number,
  repMin: number,
  repMax: number,
  rest = 90,
): WorkoutExercise {
  return {
    id: uuid(),
    exerciseId,
    order,
    sets,
    repMin,
    repMax,
    restSeconds: rest,
    setType: 'normal',
    targetRir: null,
    targetRpe: null,
    supersetId: null,
  };
}

function makeWorkout(name: string, description: string, color: string, exercises: WorkoutExercise[]): Workout {
  return {
    id: uuid(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    name,
    description,
    color,
    estimatedMinutes: 55,
    archived: false,
    exercises,
  };
}

/**
 * Carrega o programa de exemplo (Treino A/B/C + ciclo continuo).
 * Retorna nada; grava treinos e um programa ativo.
 */
export async function loadDemoProgram(userId: string): Promise<void> {
  const lib = await ensureLibrary();
  const id = (slug: string) => lib.get(slug)!;

  const a = makeWorkout('Treino A', 'Peito + Triceps', '#ff7a1a', [
    we(id('supino-reto-maquina'), 0, 4, 10, 12),
    we(id('supino-inclinado-maquina'), 1, 4, 10, 12),
    we(id('crucifixo-maquina'), 2, 3, 12, 15),
    we(id('crossover'), 3, 3, 12, 15),
    we(id('triceps-corda'), 4, 4, 10, 12, 60),
    we(id('triceps-unilateral'), 5, 3, 12, 15, 60),
  ]);

  const b = makeWorkout('Treino B', 'Costas + Biceps', '#3aa0ff', [
    we(id('puxada-frente'), 0, 4, 10, 12),
    we(id('remada-maquina'), 1, 4, 10, 12),
    we(id('remada-baixa-polia'), 2, 3, 10, 12),
    we(id('pullover-polia'), 3, 3, 12, 15),
    we(id('rosca-direta-barra'), 4, 4, 10, 12, 60),
    we(id('rosca-martelo'), 5, 3, 12, 15, 60),
  ]);

  const c = makeWorkout('Treino C', 'Pernas + Ombros', '#37c871', [
    we(id('agachamento-smith'), 0, 4, 8, 12, 120),
    we(id('leg-press'), 1, 4, 10, 12, 120),
    we(id('cadeira-extensora'), 2, 3, 12, 15),
    we(id('mesa-flexora'), 3, 4, 10, 12),
    we(id('desenvolvimento-maquina'), 4, 4, 10, 12),
    we(id('elevacao-lateral'), 5, 4, 12, 15, 60),
  ]);

  for (const w of [a, b, c]) await workoutRepo.put({ ...w, userId });

  const program: Program = {
    id: uuid(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    name: 'Meu Programa',
    scheduleType: 'cycle',
    cycleAnchorDate: todayISO(),
    fixedDays: [
      { weekday: 0, workoutId: null },
      { weekday: 1, workoutId: a.id },
      { weekday: 2, workoutId: b.id },
      { weekday: 3, workoutId: c.id },
      { weekday: 4, workoutId: a.id },
      { weekday: 5, workoutId: b.id },
      { weekday: 6, workoutId: c.id },
    ],
    cycleItems: [
      { id: uuid(), order: 0, workoutId: a.id },
      { id: uuid(), order: 1, workoutId: b.id },
      { id: uuid(), order: 2, workoutId: c.id },
      { id: uuid(), order: 3, workoutId: null },
    ],
    missedPolicy: 'keep-calendar',
    cycleOffset: 0,
    lastAdvancedDate: todayISO(),
    paused: false,
    periodizationId: null,
    periodizationStartDate: null,
    active: true,
  };

  // Desativa outros programas do usuario antes de ativar este.
  const others = await db.programs.where('userId').equals(userId).toArray();
  for (const p of others) {
    if (p.active) await programRepo.put({ ...p, active: false });
  }
  await programRepo.put({ ...program, userId });

  // Marca onboarding concluido.
  const s = await ensureSettings(userId);
  await settingsRepo.save({ ...s, onboarded: true, updatedAt: nowISO() });
}
