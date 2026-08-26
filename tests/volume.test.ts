import { describe, it, expect } from 'vitest';
import { sessionVolume, sessionCompletedSets, sessionDurationMinutes, percentChange } from '@/domain/volume';
import { set, sessionExercise, completedSession } from './factories';

describe('calculo de volume', () => {
  it('soma peso x reps das series completas', () => {
    const s = completedSession('2026-08-24', [
      sessionExercise('supino', [set(20, 10), set(20, 10)]), // 400
      sessionExercise('rosca', [set(10, 12), set(10, 8, false)]), // 120 (segunda nao conta)
    ]);
    expect(sessionVolume(s)).toBe(400 + 120);
    expect(sessionCompletedSets(s)).toBe(3);
  });

  it('calcula duracao em minutos', () => {
    const s = completedSession('2026-08-24', []);
    expect(sessionDurationMinutes(s)).toBe(60);
  });

  it('percentChange retorna variacao arredondada', () => {
    expect(percentChange(106, 100)).toBe(6);
    expect(percentChange(90, 100)).toBe(-10);
    expect(percentChange(100, 0)).toBe(null);
  });
});
