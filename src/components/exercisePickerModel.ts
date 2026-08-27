import type { Equipment, Exercise, MuscleGroup } from '@/domain/types';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '@/lib/labels';
import { normalizeText } from '@/lib/text';

export type ExerciseFilter = 'all' | 'fav' | 'custom' | MuscleGroup;

export interface PickerFilters {
  query: string;
  category: ExerciseFilter;
  equipment: Equipment | 'all';
}

export function toggleExerciseSelection(selectedIds: string[], exerciseId: string): string[] {
  return selectedIds.includes(exerciseId)
    ? selectedIds.filter((id) => id !== exerciseId)
    : [...selectedIds, exerciseId];
}

export function filterExercises(
  exercises: Exercise[],
  filters: PickerFilters,
  isFav: (exerciseId: string) => boolean,
): Exercise[] {
  const query = normalizeText(filters.query.trim());
  return exercises
    .filter((exercise) => !exercise.deletedAt)
    .filter((exercise) => {
      if (filters.category === 'fav') return isFav(exercise.id);
      if (filters.category === 'custom') return exercise.isCustom;
      if (filters.category !== 'all') {
        return exercise.primaryMuscle === filters.category || exercise.secondaryMuscles.includes(filters.category);
      }
      return true;
    })
    .filter((exercise) => filters.equipment === 'all' || exercise.equipment === filters.equipment)
    .filter((exercise) => {
      if (!query) return true;
      const searchable = [
        exercise.name,
        ...exercise.aliases,
        MUSCLE_LABEL[exercise.primaryMuscle],
        ...exercise.secondaryMuscles.map((muscle) => MUSCLE_LABEL[muscle]),
        EQUIPMENT_LABEL[exercise.equipment],
      ];
      return searchable.some((value) => normalizeText(value).includes(query));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function selectedExercisesInOrder(exercises: Exercise[], selectedIds: string[]): Exercise[] {
  const map = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  return selectedIds.map((id) => map.get(id)).filter((exercise): exercise is Exercise => !!exercise);
}

export function isExerciseAlreadyInWorkout(existingIds: string[], exerciseId: string): boolean {
  return existingIds.includes(exerciseId);
}
