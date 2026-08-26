// Biblioteca de exercicios embutida (local-first, sem API externa).
// Fonte unica de verdade em exerciseLibrary.json (compartilhada com o script de
// enriquecimento). Ids sao deterministicos (slug) para referencias estaveis.
import type { Equipment, MuscleGroup } from '@/domain/types';
import raw from './exerciseLibrary.json';

export interface ExerciseSeed {
  slug: string;
  name: string; // pt-BR
  en: string; // nome canonico em ingles (matching + alias)
  aliases: string[];
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  instructions?: string;
}

export const EXERCISE_LIBRARY: ExerciseSeed[] = raw as ExerciseSeed[];
