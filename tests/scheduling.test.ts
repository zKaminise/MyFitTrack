import { describe, it, expect } from 'vitest';
import { resolveDay, nextTrainingDay, repositionCycle } from '@/domain/scheduling';
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

  it('reposiciona o ciclo a partir de hoje sem alterar os dias anteriores', () => {
    // Cenario real: quinta=A, sexta=B, sabado=C e domingo=descanso.
    const currentProgram = makeCycleProgram(['A', 'B', 'C', null], '2026-08-27');
    expect(resolveDay(currentProgram, '2026-08-27').workoutId).toBe('A');
    expect(resolveDay(currentProgram, '2026-08-28').workoutId).toBe('B');
    expect(resolveDay(currentProgram, '2026-08-29').workoutId).toBe('C');
    expect(resolveDay(currentProgram, '2026-08-30').workoutId).toBe(null);

    const adjusted = repositionCycle(
      currentProgram,
      '2026-08-29',
      0,
      'adjust-1',
      '2026-08-29T10:00:00.000Z',
    );

    // Passado preservado.
    expect(resolveDay(adjusted, '2026-08-27').workoutId).toBe('A');
    expect(resolveDay(adjusted, '2026-08-28').workoutId).toBe('B');

    // Novo início: sábado A, domingo B, segunda C, terça descanso.
    expect(resolveDay(adjusted, '2026-08-29').workoutId).toBe('A');
    expect(resolveDay(adjusted, '2026-08-30').workoutId).toBe('B');
    expect(resolveDay(adjusted, '2026-08-31').workoutId).toBe('C');
    expect(resolveDay(adjusted, '2026-09-01').workoutId).toBe(null);
  });

  it('substitui um ajuste anterior feito na mesma data', () => {
    const first = repositionCycle(program, '2026-08-29', 0, 'adjust-1', '2026-08-29T10:00:00.000Z');
    const changed = repositionCycle(first, '2026-08-29', 2, 'adjust-2', '2026-08-29T11:00:00.000Z');
    expect(changed.cycleAdjustments).toHaveLength(1);
    expect(resolveDay(changed, '2026-08-29').workoutId).toBe('C');
    expect(resolveDay(changed, '2026-08-30').workoutId).toBe(null);
    expect(resolveDay(changed, '2026-08-31').workoutId).toBe('A');
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
