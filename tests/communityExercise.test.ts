import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/domain/types';
import { communityExerciseId, toCommunityExercise } from '@/services/communityExercise';
import { hasUnuploadedMedia } from '@/services/exerciseMediaUpload';

function custom(partial: Partial<Exercise> = {}): Exercise {
  return {
    id: '9ef0aeb3-9494-4c9c-a907-ec5be0e59ca1',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    name: 'Supino personalizado',
    aliases: [],
    primaryMuscle: 'peito',
    secondaryMuscles: ['triceps'],
    equipment: 'maquina',
    isCustom: true,
    isFavorite: false,
    alternativeIds: [],
    visibility: 'private',
    userId: 'author-a',
    ...partial,
  };
}

describe('publicação e atualização de exercício comunitário', () => {
  it('mantém o mesmo id comunitário após editar instruções e mídia', () => {
    const first = toCommunityExercise(custom(), { id: 'author-a', name: 'Gabriel' });
    const edited = toCommunityExercise(custom({
      name: 'Supino inclinado personalizado',
      instructionsList: ['Ajuste o banco.', 'Controle a descida.'],
      media: { type: 'image', remoteUrls: ['https://cdn/inicio.jpg', 'https://cdn/final.jpg'] },
      updatedAt: '2026-09-02T10:00:00.000Z',
    }), { id: 'author-a', name: 'Gabriel' });

    expect(first.id).toBe(edited.id);
    expect(edited.id).toBe(communityExerciseId('9ef0aeb3-9494-4c9c-a907-ec5be0e59ca1'));
    expect(edited.instructionsList).toEqual(['Ajuste o banco.', 'Controle a descida.']);
    expect(edited.media?.remoteUrls).toHaveLength(2);
    expect(edited.sourceExerciseId).toBe('9ef0aeb3-9494-4c9c-a907-ec5be0e59ca1');
  });

  it('detecta mídia criada offline antes da publicação', () => {
    expect(hasUnuploadedMedia({ type: 'image', remoteUrls: ['https://cdn/inicio.jpg', 'data:image/jpeg;base64,abc'] })).toBe(true);
    expect(hasUnuploadedMedia({ type: 'video', localUrl: 'data:video/mp4;base64,abc' })).toBe(true);
    expect(hasUnuploadedMedia({ type: 'image', remoteUrls: ['https://cdn/inicio.jpg'] })).toBe(false);
  });
});
