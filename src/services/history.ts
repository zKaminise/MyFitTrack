// Consultas de historico e analytics derivadas das sessoes.
import type { Session, SessionExercise, SetLog } from '@/domain/types';
import { collectExercisePoints, computeBests, type ExerciseSetPoint } from '@/domain/records';
import { estimate1RM } from '@/domain/oneRepMax';

/** Series completas da ultima sessao em que o exercicio foi executado. */
export interface LastPerformance {
  date: string;
  sets: { weight: number | null; reps: number | null }[];
}

export function findLastPerformance(
  sessions: Session[],
  exerciseId: string,
  excludeSessionId?: string,
): LastPerformance | null {
  const completed = sessions
    .filter((s) => s.status === 'completed' && s.id !== excludeSessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const session of completed) {
    const ex = session.exercises.find(
      (e) => e.performedExerciseId === exerciseId && e.sets.some((s) => s.completed),
    );
    if (ex) {
      return {
        date: session.date,
        sets: ex.sets
          .filter((s) => s.completed)
          .map((s) => ({ weight: s.weight, reps: s.reps })),
      };
    }
  }
  return null;
}

/** Peso mais recente usado (para pre-preenchimento). */
export function lastWeightUsed(sessions: Session[], exerciseId: string): number | null {
  const last = findLastPerformance(sessions, exerciseId);
  if (!last) return null;
  for (let i = last.sets.length - 1; i >= 0; i--) {
    if (last.sets[i].weight != null) return last.sets[i].weight;
  }
  return null;
}

export interface ExerciseHistoryEntry {
  sessionId: string;
  date: string;
  sets: { weight: number | null; reps: number | null }[];
}

export function exerciseHistory(sessions: Session[], exerciseId: string): ExerciseHistoryEntry[] {
  const out: ExerciseHistoryEntry[] = [];
  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    const ex = session.exercises.find(
      (e) => e.performedExerciseId === exerciseId && e.sets.some((s) => s.completed),
    );
    if (ex) {
      out.push({
        sessionId: session.id,
        date: session.date,
        sets: ex.sets.filter((s) => s.completed).map((s) => ({ weight: s.weight, reps: s.reps })),
      });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export interface ExerciseChartPoint {
  date: string;
  maxWeight: number;
  volume: number;
  est1rm: number;
}

/** Serie temporal por data (uma entrada por sessao). */
export function exerciseChartData(sessions: Session[], exerciseId: string): ExerciseChartPoint[] {
  const points = collectExercisePoints(sessions, exerciseId);
  const byDate = new Map<string, ExerciseSetPoint[]>();
  for (const p of points) {
    const arr = byDate.get(p.date) ?? [];
    arr.push(p);
    byDate.set(p.date, arr);
  }
  return [...byDate.entries()]
    .map(([date, ps]) => ({
      date,
      maxWeight: Math.max(...ps.map((p) => p.weight)),
      volume: ps.reduce((s, p) => s + p.volume, 0),
      est1rm: Math.round(Math.max(...ps.map((p) => p.est1rm)) * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export { collectExercisePoints, computeBests, estimate1RM };

/** Series de trabalho da ultima execucao (para o motor de progressao). */
export function lastWorkingSets(
  sessions: Session[],
  exerciseId: string,
  excludeSessionId?: string,
): Pick<SetLog, 'reps' | 'weight' | 'completed' | 'setType'>[] {
  const completed = sessions
    .filter((s) => s.status === 'completed' && s.id !== excludeSessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const session of completed) {
    const ex: SessionExercise | undefined = session.exercises.find(
      (e) => e.performedExerciseId === exerciseId && e.sets.some((s) => s.completed),
    );
    if (ex) {
      return ex.sets.map((s) => ({
        reps: s.reps,
        weight: s.weight,
        completed: s.completed,
        setType: s.setType,
      }));
    }
  }
  return [];
}
