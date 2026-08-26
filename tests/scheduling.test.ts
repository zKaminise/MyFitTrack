import { describe, it, expect } from 'vitest';
import { resolveDay, nextTrainingDay } from '@/domain/scheduling';
import { makeCycleProgram, makeFixedProgram } from './factories';

describe('ciclo continuo rotativo', () => {
  // A -> B -> C -> Descanso, ancorado numa segunda-feira (2026-08-24 e segunda).
  const program = makeCycleProgram(['A', 'B', 'C', null], '2026-08-24');

  it('percorre a sequencia sem reiniciar na segunda-feira', () => {
    const expected: Array<[string, string | null]> = [
      ['2026-08-24', 'A'], // seg
      ['2026-08-25', 'B'], // ter
      ['2026-08-26', 'C'], // qua
      ['2026-08-27', null], // qui (descanso)
      ['2026-08-28', 'A'], // sex
      ['2026-08-29', 'B'], // sab
      ['2026-08-30', 'C'], // dom
      ['2026-08-31', null], // seg (descanso — NAO reinicia)
      ['2026-09-01', 'A'], // ter
    ];
    for (const [date, workoutId] of expected) {
      expect(resolveDay(program, date).workoutId).toBe(workoutId);
    }
  });

  it('funciona para datas antes da ancora', () => {
    // Dia anterior a ancora deve ser o ultimo item (Descanso).
    expect(resolveDay(program, '2026-08-23').workoutId).toBe(null);
    expect(resolveDay(program, '2026-08-22').workoutId).toBe('C');
  });

  it('nextTrainingDay pula descansos', () => {
    const next = nextTrainingDay(program, '2026-08-26'); // qua = C, proximo treino
    expect(next?.date).toBe('2026-08-28'); // sex = A (qui e descanso)
    expect(next?.workoutId).toBe('A');
  });
});

describe('programacao fixa por dia da semana', () => {
  // Dom folga, Seg A, Ter B, Qua C, Qui A, Sex B, Sab C
  const program = makeFixedProgram([null, 'A', 'B', 'C', 'A', 'B', 'C']);

  it('mapeia corretamente ao longo de varias semanas', () => {
    // 2026-08-24 = segunda
    expect(resolveDay(program, '2026-08-24').workoutId).toBe('A'); // seg
    expect(resolveDay(program, '2026-08-27').workoutId).toBe('A'); // qui
    expect(resolveDay(program, '2026-08-30').workoutId).toBe(null); // dom
    // Semana seguinte mantem
    expect(resolveDay(program, '2026-08-31').workoutId).toBe('A'); // seg
    expect(resolveDay(program, '2026-09-04').workoutId).toBe('B'); // sex
  });
});
