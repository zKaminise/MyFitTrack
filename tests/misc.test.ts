import { describe, it, expect } from 'vitest';
import { estimate1RM } from '@/domain/oneRepMax';
import { currentPeriodizationWeek } from '@/domain/periodization';
import { validateBackup } from '@/domain/backupSchema';
import { applyMissedShift } from '@/domain/programAdvance';
import { resolveDay } from '@/domain/scheduling';
import { makeCycleProgram } from './factories';
import type { Periodization } from '@/domain/types';

describe('1RM estimado', () => {
  it('Epley: peso para 1 rep e o proprio peso', () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });
  it('Epley: 100kg x 10 ~ 133kg', () => {
    expect(Math.round(estimate1RM(100, 10))).toBe(133);
  });
  it('Brzycki: 100kg x 10 ~ 133kg', () => {
    expect(Math.round(estimate1RM(100, 10, 'brzycki'))).toBe(133);
  });
});

describe('periodizacao', () => {
  const periodization: Periodization = {
    id: 'p', createdAt: '', updatedAt: '', name: 'Test',
    weeks: [
      { id: 'w0', order: 0, name: 'Leve', repMin: 12, repMax: 15, intensityPct: 85, setsDelta: 0, targetRir: null, targetRpe: null, restSeconds: null, isDeload: false },
      { id: 'w1', order: 1, name: 'Pesada', repMin: 6, repMax: 8, intensityPct: 100, setsDelta: 0, targetRir: null, targetRpe: null, restSeconds: null, isDeload: false },
    ],
  };

  it('semana 1 no inicio, semana 2 apos 7 dias, reinicia depois', () => {
    const program = { ...makeCycleProgram(['A'], '2026-08-01'), periodizationStartDate: '2026-08-01' };
    expect(currentPeriodizationWeek(program, periodization, '2026-08-03')?.week.name).toBe('Leve');
    expect(currentPeriodizationWeek(program, periodization, '2026-08-09')?.week.name).toBe('Pesada');
    expect(currentPeriodizationWeek(program, periodization, '2026-08-15')?.week.name).toBe('Leve');
  });
});

describe('politica de treino perdido (shift-cycle)', () => {
  it('keep-calendar nao altera o offset', () => {
    const program = { ...makeCycleProgram(['A', 'B', 'C', null], '2026-08-24'), lastAdvancedDate: '2026-08-24', missedPolicy: 'keep-calendar' as const };
    const result = applyMissedShift(program, new Set(), '2026-08-28');
    expect(result.cycleOffset).toBe(0);
  });

  it('shift-cycle desloca quando um dia de treino e perdido', () => {
    // Ancora seg=A. Sem treinar ter (B), o ciclo desloca para que qua mostre B.
    const program = { ...makeCycleProgram(['A', 'B', 'C', null], '2026-08-24'), lastAdvancedDate: '2026-08-24', missedPolicy: 'shift-cycle' as const };
    // Perdeu 2026-08-25 (B). Processa ate 2026-08-26.
    const result = applyMissedShift(program, new Set(['2026-08-24']), '2026-08-26');
    expect(result.cycleOffset).toBe(1);
    // Agora 2026-08-26 (que seria C) mostra B.
    expect(resolveDay(result, '2026-08-26').workoutId).toBe('B');
  });
});

describe('validacao de backup', () => {
  it('rejeita objeto sem formato correto', () => {
    const r = validateBackup({ foo: 'bar' });
    expect(r.ok).toBe(false);
  });

  it('aceita backup minimo valido', () => {
    const r = validateBackup({
      format: 'fit-system-2', version: 1, exportedAt: '2026-08-25T00:00:00.000Z',
      settings: null, exercises: [], workouts: [], programs: [], periodizations: [], sessions: [], personalRecords: [],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.summary.workouts).toBe(0);
  });

  it('aceita v2 com midia e ainda importa exercicio v1 sem midia', () => {
    const meta = { id: 'e1', createdAt: '', updatedAt: '' };
    const v2Exercise = {
      ...meta, name: 'Supino', aliases: ['bench press'], primaryMuscle: 'peito',
      secondaryMuscles: ['triceps'], equipment: 'barra', isCustom: false, isFavorite: false,
      alternativeIds: [], instructionsList: ['passo 1'], bodyPart: 'chest',
      media: { type: 'image', remoteUrl: 'https://h/a.jpg', remoteUrls: ['https://h/a.jpg'], source: 'free-exercise-db', sourceExerciseId: 'x' },
    };
    const v1Exercise = {
      ...meta, id: 'e2', name: 'Antigo', aliases: [], primaryMuscle: 'costas',
      secondaryMuscles: [], equipment: 'polia', isCustom: false, isFavorite: false, alternativeIds: [],
    };
    const r = validateBackup({
      format: 'fit-system-2', version: 2, exportedAt: '2026-08-25T00:00:00.000Z',
      settings: null, exercises: [v2Exercise, v1Exercise], workouts: [], programs: [], periodizations: [], sessions: [], personalRecords: [],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.summary.exercises).toBe(2);
  });

  it('aceita backup MyFitTrack v3 com settings namespaced pelo usuario', () => {
    const result = validateBackup({
      format: 'myfittrack',
      version: 3,
      exportedAt: '2026-08-25T00:00:00.000Z',
      settings: { id: 'user-uuid', userId: 'user-uuid', theme: 'dark' },
      exercises: [], workouts: [], programs: [], periodizations: [], sessions: [], personalRecords: [],
    });
    expect(result.ok).toBe(true);
  });
});
