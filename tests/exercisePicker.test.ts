import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/domain/types';
import {
  filterExercises,
  isExerciseAlreadyInWorkout,
  selectedExercisesInOrder,
  toggleExerciseSelection,
} from '@/components/exercisePickerModel';

function exercise(id: string, name: string, primaryMuscle: Exercise['primaryMuscle'], equipment: Exercise['equipment'], aliases: string[] = []): Exercise {
  return {
    id,
    name,
    aliases,
    primaryMuscle,
    secondaryMuscles: [],
    equipment,
    isCustom: false,
    isFavorite: false,
    alternativeIds: [],
    createdAt: '',
    updatedAt: '',
  };
}

const library = [
  exercise('bench', 'Supino Reto com Barra', 'peito', 'barra', ['barbell bench press']),
  exercise('incline', 'Supino Inclinado com Halteres', 'peito', 'halteres'),
  exercise('rope', 'Tríceps Corda', 'triceps', 'polia'),
];

describe('modelo do seletor de exercicios', () => {
  it('seleciona, desmarca e preserva a ordem de selecao', () => {
    let selected: string[] = [];
    selected = toggleExerciseSelection(selected, 'incline');
    selected = toggleExerciseSelection(selected, 'bench');
    expect(selectedExercisesInOrder(library, selected).map((item) => item.id)).toEqual(['incline', 'bench']);
    selected = toggleExerciseSelection(selected, 'incline');
    expect(selected).toEqual(['bench']);
  });

  it('busca por nome e alias sem alterar a selecao', () => {
    const selected = ['bench', 'rope'];
    expect(filterExercises(library, { query: 'bench press', category: 'all', equipment: 'all' }, () => false).map((item) => item.id)).toEqual(['bench']);
    expect(selected).toEqual(['bench', 'rope']);
  });

  it('filtra por musculo e equipamento sem alterar a selecao', () => {
    const selected = ['bench'];
    expect(filterExercises(library, { query: '', category: 'peito', equipment: 'halteres' }, () => false).map((item) => item.id)).toEqual(['incline']);
    expect(selected).toEqual(['bench']);
  });

  it('filtra favoritos e detecta duplicidade no treino', () => {
    expect(filterExercises(library, { query: '', category: 'fav', equipment: 'all' }, (id) => id === 'rope').map((item) => item.id)).toEqual(['rope']);
    expect(isExerciseAlreadyInWorkout(['bench'], 'bench')).toBe(true);
    expect(isExerciseAlreadyInWorkout(['bench'], 'rope')).toBe(false);
  });
});
