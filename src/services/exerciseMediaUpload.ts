import type { Exercise, ExerciseMedia } from '@/domain/types';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/repositories/context';
import { uuid, nowISO } from '@/lib/id';
import { communityExerciseRepo, exerciseRepo } from '@/repositories/dexie';
import { toCommunityExercise } from '@/services/communityExercise';

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']);

function validate(file: File) {
  if (!ALLOWED.has(file.type)) throw new Error('Formato não suportado. Use JPG, PNG, WebP, GIF, MP4 ou WebM.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Cada arquivo deve ter no máximo 15 MB.');
}

function dataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

async function upload(exerciseId: string, kind: string, file: File): Promise<string> {
  validate(file);
  const userId = getCurrentUserId();
  if (!userId || !supabase || (typeof navigator !== 'undefined' && !navigator.onLine)) return dataUrl(file);
  const extension = file.name.split('.').pop()?.toLowerCase() || (file.type.startsWith('video/') ? 'mp4' : 'jpg');
  const path = `${userId}/${exerciseId}/${kind}-${uuid()}.${extension}`;
  const { error } = await supabase.storage.from('exercise-media').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('Não foi possível enviar a mídia. Verifique a conexão e tente novamente.');
  return supabase.storage.from('exercise-media').getPublicUrl(path).data.publicUrl;
}

export async function buildCustomExerciseMedia(exerciseId: string, input: {
  startImage?: File | null;
  endImage?: File | null;
  video?: File | null;
}): Promise<ExerciseMedia | undefined> {
  return updateCustomExerciseMedia(exerciseId, undefined, input);
}

/** Mantém a mídia existente e substitui somente os arquivos escolhidos na edição. */
export async function updateCustomExerciseMedia(exerciseId: string, current: ExerciseMedia | undefined, input: {
  startImage?: File | null;
  endImage?: File | null;
  video?: File | null;
}): Promise<ExerciseMedia | undefined> {
  if (input.video) {
    const url = await upload(exerciseId, 'video', input.video);
    return { type: 'video', remoteUrl: url.startsWith('http') ? url : null, localUrl: url.startsWith('data:') ? url : null, remoteUrls: url.startsWith('http') ? [url] : [], source: url.startsWith('http') ? 'MyFitTrack Community' : 'local' };
  }
  if (!input.startImage && !input.endImage) return current;

  const previous = current?.type === 'image'
    ? (current.remoteUrls?.length
        ? [...current.remoteUrls]
        : [current.localUrl ?? current.remoteUrl].filter((url): url is string => Boolean(url)))
    : [];
  const startUrl = input.startImage ? await upload(exerciseId, 'inicio', input.startImage) : previous[0];
  const endUrl = input.endImage ? await upload(exerciseId, 'final', input.endImage) : previous[1];
  const urls = [startUrl, endUrl].filter((url): url is string => Boolean(url));
  const first = urls[0];
  const hosted = urls.every((url) => url.startsWith('http'));
  return {
    type: 'image',
    remoteUrl: first?.startsWith('http') ? first : null,
    remoteUrls: urls,
    localUrl: first?.startsWith('data:') ? first : null,
    source: hosted ? 'MyFitTrack Community' : 'local',
  };
}

export function hasUnuploadedMedia(media: ExerciseMedia | undefined): boolean {
  return Boolean(
    media?.localUrl?.startsWith('data:')
    || media?.remoteUrls?.some((url) => url.startsWith('data:')),
  );
}

async function fileFromDataUrl(value: string, name: string): Promise<File> {
  const blob = await fetch(value).then((response) => response.blob());
  return new File([blob], name, { type: blob.type });
}

/** Envia uma publicacao criada offline e cria a copia comunitaria. */
export async function publishPendingExercise(exercise: Exercise): Promise<void> {
  if (!supabase || typeof navigator === 'undefined' || !navigator.onLine) throw new Error('Conecte-se à internet para publicar.');
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Entre novamente para publicar o exercício.');
  let media = exercise.media;
  if (media && hasUnuploadedMedia(media)) {
    if (media.type === 'video') {
      const localVideo = media.localUrl ?? media.remoteUrls?.find((url) => url.startsWith('data:'));
      if (localVideo) media = await updateCustomExerciseMedia(exercise.id, media, { video: await fileFromDataUrl(localVideo, 'execucao.mp4') });
    } else {
      const urls = media.remoteUrls?.length ? media.remoteUrls : media.localUrl ? [media.localUrl] : [];
      media = await updateCustomExerciseMedia(exercise.id, media, {
        startImage: urls[0]?.startsWith('data:') ? await fileFromDataUrl(urls[0], 'inicio.jpg') : null,
        endImage: urls[1]?.startsWith('data:') ? await fileFromDataUrl(urls[1], 'final.jpg') : null,
      });
    }
  }
  const updated: Exercise = { ...exercise, media, pendingPublication: false, updatedAt: nowISO() };
  await exerciseRepo.put(updated);
  await communityExerciseRepo.put(toCommunityExercise(updated, { id: userId, name: updated.authorName }));
}
