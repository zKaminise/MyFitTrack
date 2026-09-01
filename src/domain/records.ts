// Deteccao de recordes pessoais (PR) e estatisticas por exercicio.
import type { Session, SetLog, PersonalRecordType } from './types';
import { estimate1RM } from './oneRepMax';

export interface ExerciseSetPoint {
  date: string;
  sessionId: string;
  weight: number;
  reps: number;
  volume: number;
  est1rm: number;
}

/** Extrai todos os pontos de series completas de um exercicio dado. */
export function collectExercisePoints(
  sessions: Session[],
  exerciseId: string,
): ExerciseSetPoint[] {
  const points: ExerciseSetPoint[] = [];
  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    for (const ex of session.exercises) {
      if (ex.performedExerciseId !== exerciseId) continue;
      for (const s of ex.sets) {
        if (!s.completed || s.weight == null || s.reps == null) continue;
        if (s.setType === 'aquecimento' || s.setType === 'preparacao' || s.setType === 'ajuste') continue;
        points.push({
          date: session.date,
          sessionId: session.id,
          weight: s.weight,
          reps: s.reps,
          volume: s.weight * s.reps,
          est1rm: estimate1RM(s.weight, s.reps),
        });
      }
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export interface ExerciseBests {
  maxWeight: number;
  bestSet: { weight: number; reps: number } | null;
  maxVolumeSet: number;
  best1rm: number;
}

export function computeBests(points: ExerciseSetPoint[]): ExerciseBests {
  let maxWeight = 0;
  let bestSet: { weight: number; reps: number } | null = null;
  let bestScore = 0;
  let maxVolumeSet = 0;
  let best1rm = 0;
  for (const p of points) {
    if (p.weight > maxWeight) maxWeight = p.weight;
    if (p.volume > maxVolumeSet) maxVolumeSet = p.volume;
    if (p.est1rm > best1rm) best1rm = p.est1rm;
    // "melhor serie": prioriza carga, depois reps.
    const score = p.weight * 1000 + p.reps;
    if (score > bestScore) {
      bestScore = score;
      bestSet = { weight: p.weight, reps: p.reps };
    }
  }
  return { maxWeight, bestSet, maxVolumeSet, best1rm };
}

export interface DetectedPR {
  type: PersonalRecordType;
  value: number;
  weight?: number;
  reps?: number;
}

/**
 * Compara as series completadas de uma sessao (para um exercicio) contra os
 * pontos historicos anteriores e retorna os novos recordes atingidos.
 */
export function detectNewPRs(
  historyPoints: ExerciseSetPoint[],
  newSets: SetLog[],
): DetectedPR[] {
  const prevBests = computeBests(historyPoints);
  const prs: DetectedPR[] = [];
  let bestWeight = prevBests.maxWeight;
  let bestVolume = prevBests.maxVolumeSet;
  let best1rm = prevBests.best1rm;

  for (const s of newSets) {
    if (!s.completed || s.weight == null || s.reps == null) continue;
    if (s.setType === 'aquecimento' || s.setType === 'preparacao' || s.setType === 'ajuste') continue;
    const vol = s.weight * s.reps;
    const orm = estimate1RM(s.weight, s.reps);

    if (s.weight > bestWeight) {
      bestWeight = s.weight;
      prs.push({ type: 'max-weight', value: s.weight, weight: s.weight, reps: s.reps });
    }
    if (vol > bestVolume) {
      bestVolume = vol;
      prs.push({ type: 'max-volume', value: vol, weight: s.weight, reps: s.reps });
    }
    if (orm > best1rm + 0.0001) {
      best1rm = orm;
      prs.push({ type: 'best-1rm', value: Math.round(orm * 10) / 10, weight: s.weight, reps: s.reps });
    }
  }
  return prs;
}
