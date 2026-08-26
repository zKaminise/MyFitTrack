// Estimativa de 1RM (nao e 1RM real).
export type OneRmFormula = 'epley' | 'brzycki';

/** Epley: w * (1 + reps/30). Brzycki: w * 36 / (37 - reps). */
export function estimate1RM(
  weight: number,
  reps: number,
  formula: OneRmFormula = 'epley',
): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  if (formula === 'brzycki') {
    if (reps >= 37) return weight; // evita divisao invalida
    return (weight * 36) / (37 - reps);
  }
  return weight * (1 + reps / 30);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
