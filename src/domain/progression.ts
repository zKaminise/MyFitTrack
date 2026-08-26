// Motor de progressao de carga baseado em regra.
// NUNCA define a carga automaticamente; apenas sugere uma direcao.
import type { SetLog } from './types';

export type ProgressionDirection = 'increase' | 'hold' | 'reduce' | 'insufficient';

export interface ProgressionResult {
  direction: ProgressionDirection;
  title: string;
  message: string;
  /** Fracao das series de trabalho que atingiram o topo da faixa (0..1). */
  topRatio: number;
  /** Fracao que ficou abaixo do minimo da faixa. */
  belowRatio: number;
}

export interface ProgressionInput {
  repMin: number;
  repMax: number;
  /** Series de trabalho da ultima execucao (exclui aquecimento/preparacao). */
  sets: Pick<SetLog, 'reps' | 'weight' | 'completed' | 'setType'>[];
  /** Percentual (0..100) de series no topo necessario para sugerir aumento. */
  thresholdPct: number;
}

function workingSets(sets: ProgressionInput['sets']) {
  return sets.filter(
    (s) =>
      s.completed &&
      s.reps != null &&
      s.setType !== 'aquecimento' &&
      s.setType !== 'preparacao',
  );
}

/**
 * Avalia a ultima execucao de um exercicio e sugere progressao.
 *
 * - increase: >= thresholdPct das series atingiram o topo da faixa.
 * - reduce: qualquer serie de trabalho abaixo do minimo da faixa.
 * - hold: dentro da faixa, mas sem atingir o gatilho de aumento.
 */
export function evaluateProgression(input: ProgressionInput): ProgressionResult {
  const sets = workingSets(input.sets);
  const total = sets.length;

  if (total === 0) {
    return {
      direction: 'insufficient',
      title: 'Sem dados suficientes',
      message: 'Registre uma execucao completa para receber sugestoes de progressao.',
      topRatio: 0,
      belowRatio: 0,
    };
  }

  const atTop = sets.filter((s) => (s.reps ?? 0) >= input.repMax).length;
  const below = sets.filter((s) => (s.reps ?? 0) < input.repMin).length;
  const topRatio = atTop / total;
  const belowRatio = below / total;
  const threshold = input.thresholdPct / 100;

  if (below > 0) {
    return {
      direction: 'reduce',
      title: 'Revise a carga',
      message:
        'Seu desempenho ficou abaixo da faixa planejada. Considere manter ou reduzir a carga e revisar descanso/execucao.',
      topRatio,
      belowRatio,
    };
  }

  if (topRatio >= threshold) {
    return {
      direction: 'increase',
      title: 'Considere aumentar a carga',
      message: `Voce atingiu a faixa superior em pelo menos ${input.thresholdPct}% das series no ultimo treino.`,
      topRatio,
      belowRatio,
    };
  }

  return {
    direction: 'hold',
    title: 'Mantenha a carga',
    message: 'Voce esta dentro da faixa planejada. Continue buscando o topo da faixa.',
    topRatio,
    belowRatio,
  };
}

/**
 * Double progression: primeiro subir reps ate o topo, depois sugerir aumentar
 * carga e reiniciar proximo da parte inferior da faixa.
 */
export function doubleProgressionHint(input: ProgressionInput): ProgressionResult {
  const base = evaluateProgression(input);
  if (base.direction !== 'increase') return base;
  return {
    ...base,
    title: 'Suba a carga e reinicie a faixa',
    message: `Voce chegou ao topo (${input.repMax} reps). Aumente a carga e recomece proximo de ${input.repMin} reps.`,
  };
}
