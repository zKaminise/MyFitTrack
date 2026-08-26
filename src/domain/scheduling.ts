// Logica pura de agendamento: programacao fixa por dia da semana
// e ciclo continuo rotativo (independente da semana).
import type { Program, ISODate } from './types';
import { daysBetween, weekday } from './dates';

export interface DayResolution {
  /** Id do treino do dia, ou null se for descanso. */
  workoutId: string | null;
  isRest: boolean;
  /** Indice no ciclo (apenas para scheduleType 'cycle'). */
  cycleIndex?: number;
}

/**
 * Resolve qual treino ocorre em `date` para um programa.
 *
 * - fixed: mapeia diretamente o dia da semana.
 * - cycle: percorre a sequencia continuamente a partir de cycleAnchorDate,
 *   sem reiniciar na segunda-feira. cycleOffset desloca a sequencia
 *   (usado por treinos perdidos com politica 'shift-cycle').
 */
export function resolveDay(program: Program, date: ISODate): DayResolution {
  if (program.scheduleType === 'fixed') {
    const wd = weekday(date);
    const day = program.fixedDays.find((d) => d.weekday === wd);
    const workoutId = day?.workoutId ?? null;
    return { workoutId, isRest: workoutId === null };
  }

  // Ciclo continuo
  const items = [...program.cycleItems].sort((a, b) => a.order - b.order);
  if (items.length === 0) return { workoutId: null, isRest: true };

  const elapsed = daysBetween(program.cycleAnchorDate, date);
  // Aplica deslocamento acumulado. Normaliza para indice positivo.
  const raw = elapsed - program.cycleOffset;
  const len = items.length;
  const idx = ((raw % len) + len) % len;
  const item = items[idx];
  const workoutId = item.workoutId ?? null;
  return { workoutId, isRest: workoutId === null, cycleIndex: idx };
}

/** Resolve varios dias de uma vez (util para o calendario). */
export function resolveRange(program: Program, dates: ISODate[]): Map<ISODate, DayResolution> {
  const map = new Map<ISODate, DayResolution>();
  for (const d of dates) map.set(d, resolveDay(program, d));
  return map;
}

/**
 * Encontra a proxima data (a partir de `from`, inclusive por padrao a partir do
 * dia seguinte) que nao seja descanso. Limitado a `maxLookahead` dias.
 */
export function nextTrainingDay(
  program: Program,
  from: ISODate,
  { inclusive = false, maxLookahead = 30 }: { inclusive?: boolean; maxLookahead?: number } = {},
): { date: ISODate; workoutId: string } | null {
  const startOffset = inclusive ? 0 : 1;
  for (let i = startOffset; i <= maxLookahead; i++) {
    const date = shift(from, i);
    const res = resolveDay(program, date);
    if (!res.isRest && res.workoutId) return { date, workoutId: res.workoutId };
  }
  return null;
}

function shift(date: ISODate, days: number): ISODate {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
