import { describe, it, expect } from 'vitest';
import { collectExercisePoints, computeBests, detectNewPRs } from '@/domain/records';
import { set, sessionExercise, completedSession } from './factories';

describe('recordes pessoais', () => {
  const history = [
    completedSession('2026-08-10', [sessionExercise('supino', [set(20, 12), set(20, 10)])]),
    completedSession('2026-08-14', [sessionExercise('supino', [set(22, 10), set(22, 9)])]),
  ];

  it('coleta pontos e calcula melhores marcas', () => {
    const points = collectExercisePoints(history, 'supino');
    const bests = computeBests(points);
    expect(bests.maxWeight).toBe(22);
    expect(bests.bestSet).toEqual({ weight: 22, reps: 10 });
    expect(bests.maxVolumeSet).toBe(240); // 20x12
  });

  it('detecta novo recorde de carga', () => {
    const points = collectExercisePoints(history, 'supino');
    const prs = detectNewPRs(points, [set(25, 8)]);
    expect(prs.some((p) => p.type === 'max-weight' && p.value === 25)).toBe(true);
  });

  it('nao detecta recorde quando abaixo do historico', () => {
    const points = collectExercisePoints(history, 'supino');
    const prs = detectNewPRs(points, [set(18, 8)]);
    expect(prs.length).toBe(0);
  });

  it('detecta recorde de volume por serie', () => {
    const points = collectExercisePoints(history, 'supino');
    const prs = detectNewPRs(points, [set(21, 15)]); // 315 > 240
    expect(prs.some((p) => p.type === 'max-volume')).toBe(true);
  });
});
