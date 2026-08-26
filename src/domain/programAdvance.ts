// Aplica a politica de treino perdido para o ciclo continuo.
//
// - keep-calendar: o ciclo continua pelo calendario (o treino perdido e apenas
//   marcado como perdido). Nao altera o offset.
// - shift-cycle: cada dia de treino perdido desloca a sequencia, de modo que o
//   treino nao realizado passa para o proximo dia disponivel.
//
// Funcao pura: recebe o programa e retorna um novo programa (ou o mesmo).
import type { Program, ISODate } from './types';
import { resolveDay } from './scheduling';
import { daysBetween, addDays, todayISO } from './dates';

export function applyMissedShift(
  program: Program,
  completedDates: Set<ISODate>,
  today: ISODate = todayISO(),
): Program {
  if (program.scheduleType !== 'cycle' || program.paused) {
    return { ...program, lastAdvancedDate: today };
  }

  const start = program.lastAdvancedDate ?? addDays(today, -1);
  const gap = daysBetween(start, today);
  if (gap <= 0) return program;

  if (program.missedPolicy === 'keep-calendar') {
    return { ...program, lastAdvancedDate: today };
  }

  // shift-cycle: conta dias de treino (nao descanso) entre start (exclusivo) e
  // hoje (exclusivo) sem sessao concluida, e desloca o ciclo.
  let extraOffset = 0;
  let working = { ...program };
  for (let i = 1; i < gap; i++) {
    const date = addDays(start, i);
    const res = resolveDay(working, date);
    if (res.isRest) continue;
    if (!completedDates.has(date)) {
      extraOffset += 1;
      working = { ...working, cycleOffset: working.cycleOffset + 1 };
    }
  }

  return {
    ...program,
    cycleOffset: program.cycleOffset + extraOffset,
    lastAdvancedDate: today,
  };
}
