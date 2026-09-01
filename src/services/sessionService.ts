// Servico de ciclo de vida de sessao: construir a partir de um template,
// aplicar periodizacao, e finalizar detectando recordes.
import type {
  Workout,
  WorkoutExercise,
  Exercise,
  Program,
  Session,
  SessionExercise,
  SetLog,
  PersonalRecord,
  SetPrescription,
} from '@/domain/types';
import type { PeriodizationWeek } from '@/domain/types';
import { uuid, nowISO } from '@/lib/id';
import { todayISO } from '@/domain/dates';
import { db } from '@/db/database';
import { detectNewPRs, collectExercisePoints } from '@/domain/records';
import { lastWeightUsed } from './history';
import { getCurrentUserId } from '@/repositories/context';
import { enqueue } from '@/sync/queue';
import { prescriptionsFor } from '@/domain/setPrescription';

function makeSets(
  prescriptions: SetPrescription[],
  prefillWeight: number | null,
): SetLog[] {
  return prescriptions.map((prescription, i) => ({
    id: uuid(),
    setIndex: i + 1,
    setType: prescription.setType,
    weight: prefillWeight,
    reps: null,
    targetRir: prescription.targetRir ?? null,
    targetRpe: prescription.targetRpe ?? null,
    targetRepMin: prescription.repMin,
    targetRepMax: prescription.repMax,
    restSeconds: prescription.restSeconds,
    intraSetRestSeconds: prescription.intraSetRestSeconds ?? null,
    prescriptionNotes: prescription.notes,
    completed: false,
    completedAt: null,
  }));
}

export interface BuildSessionArgs {
  workout: Workout;
  exercisesById: Map<string, Exercise>;
  program: Program | null;
  periodWeek: PeriodizationWeek | null;
  allSessions: Session[];
  scheduledWorkoutId?: string | null;
  scheduledWorkoutName?: string | null;
  date?: string;
  scheduleSource?: Session['scheduleSource'];
  scheduleOverrideId?: string | null;
}

/** Aplica a periodizacao ao WorkoutExercise, se houver. */
function applyPeriodization(we: WorkoutExercise, week: PeriodizationWeek | null) {
  if (!week) {
    return { sets: we.sets, repMin: we.repMin, repMax: we.repMax, rest: we.restSeconds };
  }
  return {
    sets: Math.max(1, we.sets + week.setsDelta),
    repMin: week.repMin,
    repMax: week.repMax,
    rest: week.restSeconds ?? we.restSeconds,
  };
}

export function buildSession(args: BuildSessionArgs): Session {
  const { workout, exercisesById, program, periodWeek, allSessions } = args;
  const exercises: SessionExercise[] = [...workout.exercises]
    .sort((a, b) => a.order - b.order)
    .map((we, idx) => {
      const exercise = exercisesById.get(we.exerciseId);
      const name = exercise?.name ?? 'Exercicio';
      const p = applyPeriodization(we, periodWeek);
      const prescribed = we.setPrescriptions?.length
        ? prescriptionsFor(we)
        : Array.from({ length: p.sets }, (_, order): SetPrescription => ({
            id: uuid(), order, repMin: p.repMin, repMax: p.repMax, restSeconds: p.rest,
            setType: we.setType, targetRir: week(periodWeek, we, 'rir'), targetRpe: week(periodWeek, we, 'rpe'),
          }));
      const prefill = lastWeightUsed(allSessions, we.exerciseId);
      return {
        id: uuid(),
        order: idx,
        plannedExerciseId: we.exerciseId,
        performedExerciseId: we.exerciseId,
        plannedExerciseName: name,
        performedExerciseName: name,
        status: 'planned',
        substituted: false,
        targetSets: prescribed.length,
        repMin: Math.min(...prescribed.map((item) => item.repMin)),
        repMax: Math.max(...prescribed.map((item) => item.repMax)),
        restSeconds: prescribed[0]?.restSeconds ?? p.rest,
        notes: we.notes,
        supersetId: we.supersetId ?? null,
        sets: makeSets(prescribed, prefill),
      };
    });

  return {
    id: uuid(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    userId: getCurrentUserId(),
    workoutId: workout.id,
    scheduledWorkoutId: args.scheduledWorkoutId ?? workout.id,
    scheduledWorkoutName: args.scheduledWorkoutName ?? workout.name,
    performedWorkoutId: workout.id,
    scheduleSource: args.scheduleSource ?? 'scheduled',
    scheduleOverrideId: args.scheduleOverrideId ?? null,
    workoutName: workout.name,
    workoutDescription: workout.description,
    programId: program?.id ?? null,
    scheduleType: program?.scheduleType,
    date: args.date ?? todayISO(),
    startedAt: nowISO(),
    endedAt: null,
    status: 'active',
    exercises,
    perceivedEffort: null,
    note: '',
    periodizationWeekName: periodWeek?.name ?? null,
  };
}

function week(w: PeriodizationWeek | null, we: WorkoutExercise, kind: 'rir' | 'rpe'): number | null {
  if (kind === 'rir') return w?.targetRir ?? we.targetRir ?? null;
  return w?.targetRpe ?? we.targetRpe ?? null;
}

/** Sessao vazia para execucao livre (sem template). */
export function buildEmptySession(): Session {
  return {
    id: uuid(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    userId: getCurrentUserId(),
    workoutId: null,
    workoutName: 'Treino livre',
    programId: null,
    date: todayISO(),
    startedAt: nowISO(),
    endedAt: null,
    status: 'active',
    exercises: [],
    perceivedEffort: null,
    note: '',
  };
}

export function newSessionExercise(exercise: Exercise, order: number, defaultRest: number): SessionExercise {
  return {
    id: uuid(),
    order,
    plannedExerciseId: exercise.id,
    performedExerciseId: exercise.id,
    plannedExerciseName: exercise.name,
    performedExerciseName: exercise.name,
    status: 'planned',
    substituted: false,
    targetSets: 3,
    repMin: 10,
    repMax: 12,
    restSeconds: defaultRest,
    supersetId: null,
    sets: makeSets(Array.from({ length: 3 }, (_, order) => ({ id: uuid(), order, repMin: 10, repMax: 12, restSeconds: defaultRest, setType: 'normal' })), null),
  };
}

/**
 * Finaliza a sessao: marca status completed, detecta recordes e persiste tudo.
 * Retorna a sessao final e a lista de PRs detectados.
 */
export async function finalizeSession(
  session: Session,
): Promise<{ session: Session; prCount: number }> {
  const uid = session.userId ?? getCurrentUserId();
  const priorSessions = (await db.sessions.toArray()).filter(
    (s) => s.status === 'completed' && s.id !== session.id && s.userId === uid,
  );

  const finalized: Session = {
    ...session,
    userId: uid,
    status: 'completed',
    endedAt: session.endedAt ?? nowISO(),
    updatedAt: nowISO(),
  };

  const prRecords: PersonalRecord[] = [];
  for (const ex of finalized.exercises) {
    const completedSets = ex.sets.filter((s) => s.completed);
    if (completedSets.length === 0) continue;
    const history = collectExercisePoints(priorSessions, ex.performedExerciseId);
    const prs = detectNewPRs(history, completedSets);
    for (const pr of prs) {
      prRecords.push({
        id: uuid(),
        createdAt: nowISO(),
        updatedAt: nowISO(),
        userId: uid,
        exerciseId: ex.performedExerciseId,
        type: pr.type,
        value: pr.value,
        weight: pr.weight ?? null,
        reps: pr.reps ?? null,
        sessionId: finalized.id,
        date: finalized.date,
      });
    }
  }

  await db.transaction('rw', [db.sessions, db.personalRecords], async () => {
    await db.sessions.put(finalized);
    if (prRecords.length) await db.personalRecords.bulkPut(prRecords);
  });

  // Enfileira para sincronizacao (no-op em modo local).
  await enqueue('session', finalized.id, 'upsert', finalized);
  for (const pr of prRecords) await enqueue('personalRecord', pr.id, 'upsert', pr);

  return { session: finalized, prCount: prRecords.length };
}
