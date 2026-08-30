// Logica pura de agendamento: programacao fixa por dia da semana
// e ciclo continuo rotativo (independente da semana).
import type { CycleAdjustment, Program, ISODate, ISODateTime } from './types';
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

  const len = items.length;
  const adjustments = [...(program.cycleAdjustments ?? [])]
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate) || a.createdAt.localeCompare(b.createdAt));
  let activeAdjustmentIndex = -1;
  for (let index = 0; index < adjustments.length; index++) {
    if (adjustments[index].effectiveDate > date) break;
    activeAdjustmentIndex = index;
  }
  const activeAdjustment = activeAdjustmentIndex >= 0 ? adjustments[activeAdjustmentIndex] : undefined;

  let raw: number;
  if (activeAdjustment) {
    const savedIndex = items.findIndex((item) => item.id === activeAdjustment.cycleItemId);
    const startIndex = savedIndex >= 0 ? savedIndex : activeAdjustment.cycleIndex;
    const elapsedFromAdjustment = daysBetween(activeAdjustment.effectiveDate, date);
    const offsetAtSegmentEnd = adjustments[activeAdjustmentIndex + 1]?.cycleOffsetAtStart ?? program.cycleOffset;
    const laterOffset = offsetAtSegmentEnd - activeAdjustment.cycleOffsetAtStart;
    raw = startIndex + elapsedFromAdjustment - laterOffset;
  } else {
    const elapsed = daysBetween(program.cycleAnchorDate, date);
    // Se existe ajuste futuro, congela o offset anterior no valor que ele tinha
    // ao criar esse ajuste. Assim ajustes posteriores não reescrevem o passado.
    const firstFutureAdjustment = adjustments[0];
    const effectiveOffset = firstFutureAdjustment?.cycleOffsetAtStart ?? program.cycleOffset;
    raw = elapsed - effectiveOffset;
  }

  // Normaliza para índice positivo.
  const idx = ((raw % len) + len) % len;
  const item = items[idx];
  const workoutId = item.workoutId ?? null;
  return { workoutId, isRest: workoutId === null, cycleIndex: idx };
}

/**
 * Reposiciona o ciclo a partir de uma data sem alterar sua sequência nem os
 * dias anteriores. Um segundo ajuste na mesma data substitui o primeiro.
 */
export function repositionCycle(
  program: Program,
  effectiveDate: ISODate,
  cycleIndex: number,
  id: string,
  createdAt: ISODateTime,
): Program {
  const items = [...program.cycleItems].sort((a, b) => a.order - b.order);
  if (program.scheduleType !== 'cycle' || items.length === 0) return program;
  const normalizedIndex = ((cycleIndex % items.length) + items.length) % items.length;
  const adjustment: CycleAdjustment = {
    id,
    effectiveDate,
    cycleItemId: items[normalizedIndex].id,
    cycleIndex: normalizedIndex,
    cycleOffsetAtStart: program.cycleOffset,
    createdAt,
  };
  return {
    ...program,
    cycleAdjustments: [
      ...(program.cycleAdjustments ?? []).filter((item) => item.effectiveDate !== effectiveDate),
      adjustment,
    ].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)),
    lastAdvancedDate: effectiveDate,
  };
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
