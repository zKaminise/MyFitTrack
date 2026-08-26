import { describe, it, expect } from 'vitest';
// @ts-expect-error — modulo JS puro compartilhado com o script de enriquecimento
import { classifyMatch, scoreCandidate } from '../scripts/matching.mjs';

const fedb = [
  { name: 'Barbell Bench Press - Medium Grip', equipment: 'barbell', primaryMuscles: ['chest'] },
  { name: 'Barbell Squat', equipment: 'barbell', primaryMuscles: ['quadriceps'] },
  { name: 'Barbell Squat To A Bench', equipment: 'barbell', primaryMuscles: ['quadriceps'] },
  { name: 'Barbell Full Squat', equipment: 'barbell', primaryMuscles: ['quadriceps'] },
  { name: 'Leg Press', equipment: 'machine', primaryMuscles: ['quadriceps'] },
  { name: 'Concentration Curls', equipment: 'dumbbell', primaryMuscles: ['biceps'] },
];

describe('matching de exercicios', () => {
  it('encontra o match correto por nome + equipamento + musculo', () => {
    const our = { en: 'Barbell Bench Press - Medium Grip', name: 'Supino Reto Barra', aliases: ['bench press'], primaryMuscle: 'peito', equipment: 'barra' };
    const r = classifyMatch(our, fedb);
    expect(r.status).toBe('matched');
    expect(r.match.name).toBe('Barbell Bench Press - Medium Grip');
    expect(r.confidence).toBeGreaterThan(0.68);
  });

  it('nao aceita automaticamente quando ha candidatos empatados (ambiguous)', () => {
    const our = { en: 'Barbell Squat', name: 'Agachamento Livre', aliases: [], primaryMuscle: 'quadriceps', equipment: 'barra' };
    const r = classifyMatch(our, fedb);
    // "Barbell Squat" e "Barbell Full Squat" ficam empatados no topo.
    expect(r.status).toBe('ambiguous');
    expect(r.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it('retorna unmatched quando nao ha correspondencia', () => {
    const our = { en: 'Burpee', name: 'Burpee', aliases: [], primaryMuscle: 'corpo-inteiro', equipment: 'peso-corporal' };
    const r = classifyMatch(our, fedb);
    expect(r.status).toBe('unmatched');
  });

  it('penaliza equipamento divergente', () => {
    const our = { en: 'Leg Press', name: 'Leg Press', aliases: [], primaryMuscle: 'quadriceps', equipment: 'maquina' };
    const withMachine = scoreCandidate(our, { name: 'Leg Press', equipment: 'machine', primaryMuscles: ['quadriceps'] });
    const withBarbell = scoreCandidate(our, { name: 'Leg Press', equipment: 'barbell', primaryMuscles: ['quadriceps'] });
    expect(withMachine).toBeGreaterThan(withBarbell);
  });
});
