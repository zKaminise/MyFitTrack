// Calculo de volume (peso x reps) em varios niveis.
import type { SetLog, SessionExercise, Session } from './types';

export function setVolume(set: SetLog): number {
  if (!set.completed || set.weight == null || set.reps == null) return 0;
  return set.weight * set.reps;
}

export function exerciseVolume(ex: SessionExercise): number {
  return ex.sets.reduce((sum, s) => sum + setVolume(s), 0);
}

export function sessionVolume(session: Session): number {
  return session.exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

export function sessionCompletedSets(session: Session): number {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0,
  );
}

export function sessionDurationMinutes(session: Session): number {
  if (!session.endedAt) return 0;
  const ms = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

/** Compara volume atual vs anterior, retorna variacao percentual (arredondada). */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
