import type { Program, Session, SessionExercise, SetLog, CycleItem } from '@/domain/types';

let n = 0;
const id = () => `id-${n++}`;

export function makeCycleProgram(sequence: (string | null)[], anchorDate: string): Program {
  const cycleItems: CycleItem[] = sequence.map((workoutId, order) => ({ id: id(), order, workoutId }));
  return {
    id: 'prog', createdAt: '', updatedAt: '',
    name: 'Test', scheduleType: 'cycle', cycleAnchorDate: anchorDate,
    fixedDays: [], cycleItems,
    missedPolicy: 'keep-calendar', cycleOffset: 0, lastAdvancedDate: null,
    paused: false, periodizationId: null, periodizationStartDate: null, active: true,
  };
}

export function makeFixedProgram(days: (string | null)[]): Program {
  return {
    id: 'prog', createdAt: '', updatedAt: '',
    name: 'Test', scheduleType: 'fixed', cycleAnchorDate: '2026-01-01',
    fixedDays: days.map((workoutId, weekday) => ({ weekday, workoutId })),
    cycleItems: [],
    missedPolicy: 'keep-calendar', cycleOffset: 0, lastAdvancedDate: null,
    paused: false, periodizationId: null, periodizationStartDate: null, active: true,
  };
}

export function set(weight: number, reps: number, completed = true, setType: SetLog['setType'] = 'normal'): SetLog {
  return { id: id(), setIndex: 0, setType, weight, reps, completed, completedAt: null };
}

export function sessionExercise(exerciseId: string, sets: SetLog[], overrides: Partial<SessionExercise> = {}): SessionExercise {
  return {
    id: id(), order: 0,
    plannedExerciseId: exerciseId, performedExerciseId: exerciseId,
    plannedExerciseName: exerciseId, performedExerciseName: exerciseId,
    status: 'completed', substituted: false, targetSets: sets.length,
    repMin: 10, repMax: 12, restSeconds: 90, supersetId: null,
    sets: sets.map((s, i) => ({ ...s, setIndex: i + 1 })),
    ...overrides,
  };
}

export function completedSession(date: string, exercises: SessionExercise[], overrides: Partial<Session> = {}): Session {
  return {
    id: id(), createdAt: '', updatedAt: '',
    workoutId: 'w', workoutName: 'W', date,
    startedAt: `${date}T10:00:00.000Z`, endedAt: `${date}T11:00:00.000Z`,
    status: 'completed', exercises, perceivedEffort: null, note: '',
    ...overrides,
  };
}
