import { describe, expect, it } from 'vitest';
import type { Session, SetLog, SetType, Workout } from '@/domain/types';
import { performanceReferences } from '@/domain/performanceReference';
import { buildSession } from '@/services/sessionService';

function session(id: string, date: string, types: SetType[], weights: number[]): Session {
  return { id, workoutId: id, workoutName: `Treino ${id}`, date, createdAt: date, updatedAt: date, startedAt: date, endedAt: date,
    programId: null, status: 'completed', exercises: [{ id: 'bench', order: 0, plannedExerciseId: 'bench', performedExerciseId: 'bench', plannedExerciseName: 'Supino', performedExerciseName: 'Supino', status: 'completed', substituted: false,
      targetSets: types.length, repMin: 8, repMax: 12, restSeconds: 90,
      sets: types.map((setType, i): SetLog => ({ id: `${i}`, setIndex: i + 1, setType, weight: weights[i], reps: 12 - i, completed: true, completedAt: date })),
    }], perceivedEffort: null };
}
const typesA: SetType[] = ['aquecimento', 'ajuste', 'trabalho', 'trabalho'];
const typesE: SetType[] = ['aquecimento', 'ajuste', 'ajuste', 'trabalho', 'trabalho'];
const a = session('A', '2026-09-10', typesA, [15, 25, 40, 40]);
const e = session('E', '2026-09-12', typesE, [20, 30, 35, 50, 50]);

describe('Referências entre treinos por tipo de série', () => {
  it('usa as duas séries de trabalho de E em A sem confundir com o segundo ajuste', () => {
    const references = performanceReferences([a, e], 'bench', typesA.map(setType => ({ setType })));
    expect(references.map(r => r?.weight)).toEqual([20, 30, 50, 50]);
    expect(references.map(r => r?.setIndex)).toEqual([1, 2, 4, 5]);
    expect(references.every(r => r?.workoutName === 'Treino E')).toBe(true);
  });
  it('marca referência repetida quando hoje tem mais ajustes do que o último treino', () => {
    const references = performanceReferences([a], 'bench', typesE.map(setType => ({ setType })));
    expect(references.map(r => r?.weight)).toEqual([15, 25, 25, 40, 40]);
    expect(references[2]?.reused).toBe(true);
    expect(references[3]?.reused).toBe(false);
  });
  it('não comprime séries incompletas nem usa exercício planejado de uma substituição', () => {
    const incomplete = structuredClone(e);
    incomplete.exercises[0].sets[3].completed = false;
    const refs = performanceReferences([incomplete], 'bench', typesA.map(setType => ({ setType })));
    expect(refs[2]).toMatchObject({ setIndex: 5, reused: true });
    expect(refs[3]).toMatchObject({ setIndex: 5, reused: false });
    incomplete.exercises[0].performedExerciseId = 'dumbbell';
    expect(performanceReferences([incomplete], 'bench', [{ setType: 'trabalho' }])).toEqual([null]);
  });
  it('usa normal como trabalho legado; tipo ausente não pega aquecimento', () => {
    const legacy = session('old', '2026-09-01', ['normal'], [45]);
    expect(performanceReferences([legacy], 'bench', [{ setType: 'trabalho' }])[0]?.weight).toBe(45);
    expect(performanceReferences([legacy], 'bench', [{ setType: 'aquecimento' }])).toEqual([null]);
    expect(performanceReferences([legacy], 'bench', [{ setType: 'trabalho' }], 'old')).toEqual([null]);
  });
  it('pré-preenche cada tipo ao iniciar A, mantém referências de 50 kg e não marca conclusão', () => {
    const workout: Workout = { id: 'A', name: 'A', archived: false, createdAt: '', updatedAt: '', exercises: [{ id: 'config', exerciseId: 'bench', order: 0, sets: 4, setType: 'normal', repMin: 8, repMax: 12, restSeconds: 90,
      setPrescriptions: typesA.map((setType, order) => ({ id: String(order), order, setType, repMin: 8, repMax: 12, restSeconds: 90 })),
    }] };
    const active = buildSession({ workout, exercisesById: new Map(), program: null, periodWeek: null, allSessions: [a, e] });
    expect(active.exercises[0].sets.map(s => s.weight)).toEqual([20, 30, 50, 50]);
    expect(active.exercises[0].sets.every(s => !s.completed && s.reps === null)).toBe(true);
    expect(e.exercises[0].sets).toHaveLength(5);
  });
});
