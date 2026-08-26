import { describe, it, expect } from 'vitest';
import { evaluateProgression, doubleProgressionHint } from '@/domain/progression';
import { set } from './factories';

const base = { repMin: 10, repMax: 12, thresholdPct: 75 };

describe('motor de progressao', () => {
  it('sugere aumentar quando >=75% das series atingem o topo (12,12,12,11)', () => {
    const r = evaluateProgression({ ...base, sets: [set(22, 12), set(22, 12), set(22, 12), set(22, 11)] });
    expect(r.direction).toBe('increase');
    expect(r.topRatio).toBeCloseTo(0.75);
  });

  it('mantem quando dentro da faixa mas sem atingir o gatilho (11,11,10,10)', () => {
    const r = evaluateProgression({ ...base, sets: [set(22, 11), set(22, 11), set(22, 10), set(22, 10)] });
    expect(r.direction).toBe('hold');
  });

  it('sugere revisar quando abaixo da faixa (8,8,7,6)', () => {
    const r = evaluateProgression({ ...base, sets: [set(22, 8), set(22, 8), set(22, 7), set(22, 6)] });
    expect(r.direction).toBe('reduce');
  });

  it('ignora series de aquecimento', () => {
    const r = evaluateProgression({
      ...base,
      sets: [set(10, 20, true, 'aquecimento'), set(22, 12), set(22, 12), set(22, 12), set(22, 12)],
    });
    expect(r.direction).toBe('increase');
    expect(r.topRatio).toBe(1);
  });

  it('retorna insufficient sem series completas', () => {
    const r = evaluateProgression({ ...base, sets: [set(22, 12, false)] });
    expect(r.direction).toBe('insufficient');
  });

  it('threshold 100% exige todas no topo', () => {
    const r = evaluateProgression({ ...base, thresholdPct: 100, sets: [set(22, 12), set(22, 12), set(22, 12), set(22, 11)] });
    expect(r.direction).toBe('hold');
  });

  it('double progression ajusta a mensagem no aumento', () => {
    const r = doubleProgressionHint({ ...base, sets: [set(22, 12), set(22, 12), set(22, 12), set(22, 12)] });
    expect(r.direction).toBe('increase');
    expect(r.message).toMatch(/reinicie|recomece|reinicia|10/i);
  });
});
