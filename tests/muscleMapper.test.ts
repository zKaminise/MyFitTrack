import { describe, it, expect } from 'vitest';
import { ourMuscleToBody, externalMuscleToOur, externalMuscleToBody } from '@/data/muscleMapper';

describe('muscle mapper', () => {
  it('mapeia vocabulario externo para nossos grupos', () => {
    expect(externalMuscleToOur('pectorals')).toBe('peito');
    expect(externalMuscleToOur('chest')).toBe('peito');
    expect(externalMuscleToOur('delts')).toBe('ombros');
    expect(externalMuscleToOur('shoulders')).toBe('ombros');
    expect(externalMuscleToOur('quads')).toBe('quadriceps');
    expect(externalMuscleToOur('quadriceps')).toBe('quadriceps');
    expect(externalMuscleToOur('hamstrings')).toBe('posterior');
    expect(externalMuscleToOur('glutes')).toBe('gluteos');
    expect(externalMuscleToOur('calves')).toBe('panturrilha');
    expect(externalMuscleToOur('abs')).toBe('abdomen');
    expect(externalMuscleToOur('traps')).toBe('trapezio');
    expect(externalMuscleToOur('lats')).toBe('costas');
  });

  it('e case-insensitive e retorna null para desconhecidos', () => {
    expect(externalMuscleToOur('CHEST')).toBe('peito');
    expect(externalMuscleToOur('inexistente')).toBe(null);
  });

  it('mapeia nossos grupos para musculos do body map', () => {
    expect(ourMuscleToBody('peito')).toEqual(['chest']);
    expect(ourMuscleToBody('ombros')).toContain('front-deltoids');
    expect(ourMuscleToBody('quadriceps')).toEqual(['quadriceps']);
    expect(ourMuscleToBody('cardio')).toEqual([]);
  });

  it('externalMuscleToBody compoe as duas conversoes (pectorals -> chest)', () => {
    expect(externalMuscleToBody('pectorals')).toEqual(['chest']);
    expect(externalMuscleToBody('triceps')).toEqual(['triceps']);
  });
});
