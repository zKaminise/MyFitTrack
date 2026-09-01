import type { SetPrescription, WorkoutExercise } from './types';
import { uuid } from '@/lib/id';

export function prescriptionsFor(exercise: WorkoutExercise): SetPrescription[] {
  const existing = exercise.setPrescriptions;
  if (existing?.length) {
    return [...existing]
      .sort((a, b) => a.order - b.order)
      .map((item, order) => ({ ...item, order }));
  }
  return Array.from({ length: exercise.sets }, (_, order) => ({
    id: uuid(), order,
    repMin: exercise.repMin, repMax: exercise.repMax,
    restSeconds: exercise.restSeconds, setType: exercise.setType,
    targetRir: exercise.targetRir ?? null, targetRpe: exercise.targetRpe ?? null,
    intraSetRestSeconds: null,
  }));
}

export function resizePrescriptions(exercise: WorkoutExercise, count: number): SetPrescription[] {
  const current = prescriptionsFor(exercise);
  if (count <= current.length) return current.slice(0, count).map((item, order) => ({ ...item, order }));
  const fallback = current[current.length - 1] ?? prescriptionsFor({ ...exercise, sets: 1 })[0];
  return [...current, ...Array.from({ length: count - current.length }, (_, offset) => ({
    ...fallback, id: uuid(), order: current.length + offset,
  }))];
}

export function applyPrescriptionSummary(exercise: WorkoutExercise, items: SetPrescription[]): WorkoutExercise {
  const normalized = items.map((item, order) => ({
    ...item, order,
    repMin: Math.max(1, item.repMin),
    repMax: Math.max(Math.max(1, item.repMin), item.repMax),
    restSeconds: Math.max(0, item.restSeconds),
  }));
  const mins = normalized.map((item) => item.repMin);
  const maxs = normalized.map((item) => item.repMax);
  const first = normalized[0];
  return {
    ...exercise,
    sets: normalized.length,
    repMin: Math.min(...mins), repMax: Math.max(...maxs),
    restSeconds: first?.restSeconds ?? exercise.restSeconds,
    setType: first?.setType ?? exercise.setType,
    setPrescriptions: normalized,
  };
}

export function hasMixedPrescription(exercise: WorkoutExercise): boolean {
  const items = exercise.setPrescriptions ?? [];
  if (items.length < 2) return false;
  const first = items[0];
  return items.some((item) => item.repMin !== first.repMin || item.repMax !== first.repMax || item.restSeconds !== first.restSeconds || item.setType !== first.setType);
}
