// Logica de periodizacao: determina a semana atual do plano.
import type { Periodization, Program } from './types';
import { daysBetween, todayISO } from './dates';

export interface CurrentWeekInfo {
  weekIndex: number; // 0-based
  weekNumber: number; // 1-based
  totalWeeks: number;
  week: Periodization['weeks'][number];
}

/**
 * Determina a semana de periodizacao vigente. A periodizacao roda em ciclo:
 * ao terminar a ultima semana, reinicia na primeira.
 */
export function currentPeriodizationWeek(
  program: Program,
  periodization: Periodization,
  onDate = todayISO(),
): CurrentWeekInfo | null {
  const weeks = [...periodization.weeks].sort((a, b) => a.order - b.order);
  if (weeks.length === 0) return null;
  const start = program.periodizationStartDate ?? program.cycleAnchorDate;
  const elapsedDays = Math.max(0, daysBetween(start, onDate));
  const elapsedWeeks = Math.floor(elapsedDays / 7);
  const idx = elapsedWeeks % weeks.length;
  return {
    weekIndex: idx,
    weekNumber: idx + 1,
    totalWeeks: weeks.length,
    week: weeks[idx],
  };
}
