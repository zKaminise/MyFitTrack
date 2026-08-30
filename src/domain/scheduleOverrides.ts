import type { ISODate, Program, ScheduleOverride } from './types';
import { resolveDay } from './scheduling';

export interface ScheduleResolution {
  baseWorkoutId: string | null;
  effectiveWorkoutId: string | null;
  isRest: boolean;
  source: 'base' | 'override' | 'swap';
  override: ScheduleOverride | null;
}

/** Resolve base primeiro e aplica, no maximo, um override daquela data. */
export function resolveSchedule(
  program: Program,
  date: ISODate,
  overrides: ScheduleOverride[],
): ScheduleResolution {
  const base = resolveDay(program, date);
  const override = overrides
    .filter((item) => item.programId === program.id && item.date === date && !item.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  const effectiveWorkoutId = override ? override.overrideWorkoutId : base.workoutId;
  return {
    baseWorkoutId: base.workoutId,
    effectiveWorkoutId,
    isRest: effectiveWorkoutId === null,
    source: override ? (override.type === 'swap' ? 'swap' : 'override') : 'base',
    override,
  };
}

/** Mantem somente a versao mais recente para cada programa/data. */
export function compactScheduleOverrides(overrides: ScheduleOverride[]): ScheduleOverride[] {
  const byDate = new Map<string, ScheduleOverride>();
  for (const item of overrides) {
    const key = `${item.programId}:${item.date}`;
    const current = byDate.get(key);
    if (!current || item.updatedAt >= current.updatedAt) byDate.set(key, item);
  }
  return [...byDate.values()];
}
