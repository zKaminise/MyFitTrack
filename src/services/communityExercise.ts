import type { Exercise, ID } from '@/domain/types';
import { stableUuid } from '@/lib/id';

export function communityExerciseId(sourceExerciseId: ID): ID {
  return stableUuid(`community:${sourceExerciseId}`);
}

/**
 * A publicação conserva sempre o mesmo UUID. Assim, treinos de outros usuários
 * continuam apontando para o exercício e recebem futuras correções de mídia,
 * instruções e metadados pelo sync normal.
 */
export function toCommunityExercise(
  exercise: Exercise,
  author: { id: ID; name?: string | null },
): Exercise {
  return {
    ...exercise,
    id: communityExerciseId(exercise.sourceExerciseId ?? exercise.id),
    userId: null,
    visibility: 'community',
    authorId: author.id,
    authorName: author.name ?? exercise.authorName ?? null,
    sourceExerciseId: exercise.sourceExerciseId ?? exercise.id,
    pendingPublication: false,
  };
}
