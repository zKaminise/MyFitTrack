// Validacao de estrutura de backup com Zod. Nunca importar JSON invalido cegamente.
import { z } from 'zod';
import type { BackupData } from './types';

const meta = {
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
};

const setLog = z.object({
  id: z.string(),
  setIndex: z.number(),
  setType: z.string(),
  weight: z.number().nullable(),
  reps: z.number().nullable(),
  targetRir: z.number().nullable().optional(),
  targetRpe: z.number().nullable().optional(),
  completed: z.boolean(),
  completedAt: z.string().nullable().optional(),
});

const sessionExercise = z.object({
  id: z.string(),
  order: z.number(),
  plannedExerciseId: z.string(),
  performedExerciseId: z.string(),
  plannedExerciseName: z.string(),
  performedExerciseName: z.string(),
  status: z.string(),
  substituted: z.boolean(),
  reason: z.string().optional(),
  targetSets: z.number(),
  repMin: z.number(),
  repMax: z.number(),
  restSeconds: z.number(),
  notes: z.string().optional(),
  supersetId: z.string().nullable().optional(),
  sets: z.array(setLog),
});

const media = z
  .object({
    type: z.string(),
    remoteUrl: z.string().nullable().optional(),
    remoteUrls: z.array(z.string()).optional(),
    localUrl: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    sourceExerciseId: z.string().nullable().optional(),
  })
  .optional();

const exercise = z.object({
  ...meta,
  name: z.string(),
  aliases: z.array(z.string()),
  primaryMuscle: z.string(),
  secondaryMuscles: z.array(z.string()),
  equipment: z.string(),
  instructions: z.string().optional(),
  // Campos adicionados na biblioteca visual (v2) — opcionais p/ compat com v1.
  instructionsList: z.array(z.string()).optional(),
  bodyPart: z.string().nullable().optional(),
  media,
  mediaUrl: z.string().nullable().optional(),
  isCustom: z.boolean(),
  isFavorite: z.boolean(),
  alternativeIds: z.array(z.string()),
});

const workout = z.object({
  ...meta,
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  estimatedMinutes: z.number().optional(),
  notes: z.string().optional(),
  archived: z.boolean(),
  exercises: z.array(z.any()),
});

const program = z.object({ ...meta }).passthrough();
const periodization = z.object({ ...meta }).passthrough();

const session = z.object({
  ...meta,
  workoutId: z.string().nullable(),
  workoutName: z.string(),
  date: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  status: z.string(),
  exercises: z.array(sessionExercise),
  perceivedEffort: z.string().nullable().optional(),
  note: z.string().optional(),
}).passthrough();

// v1 usava `singleton`; v2+ usa o UUID da conta. Ambos continuam validos.
const settings = z.object({ id: z.string().min(1) }).passthrough().nullable();

export const backupSchema = z.object({
  format: z.union([z.literal('myfittrack'), z.literal('fit-system-2')]),
  version: z.number(),
  exportedAt: z.string(),
  settings,
  exercises: z.array(exercise),
  workouts: z.array(workout),
  programs: z.array(program),
  periodizations: z.array(periodization),
  sessions: z.array(session),
  personalRecords: z.array(z.object({ ...meta }).passthrough()),
  scheduleOverrides: z.array(z.object({ ...meta }).passthrough()).default([]),
  nutritionSettings: z.array(z.object({ ...meta }).passthrough()).default([]),
  userFoods: z.array(z.object({ ...meta }).passthrough()).default([]),
  savedMeals: z.array(z.object({ ...meta }).passthrough()).default([]),
  nutritionDays: z.array(z.object({ ...meta }).passthrough()).default([]),
});

export interface BackupSummary {
  exportedAt: string;
  workouts: number;
  sessions: number;
  exercises: number;
}

export function validateBackup(raw: unknown):
  | { ok: true; data: BackupData; summary: BackupSummary }
  | { ok: false; error: string } {
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first ? `${first.path.join('.')}: ${first.message}` : 'Estrutura invalida',
    };
  }
  const data = parsed.data as unknown as BackupData;
  return {
    ok: true,
    data,
    summary: {
      exportedAt: data.exportedAt,
      workouts: data.workouts.length,
      sessions: data.sessions.length,
      exercises: data.exercises.length,
    },
  };
}
