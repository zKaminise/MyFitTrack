import type { Exercise, ExerciseMedia } from '@/domain/types';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/repositories/context';
import { uuid, stableUuid, nowISO } from '@/lib/id';
import { communityExerciseRepo, exerciseRepo } from '@/repositories/dexie';

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
  if (input.video) {
    const url = await upload(exerciseId, 'video', input.video);
    return { type: 'video', remoteUrl: url.startsWith('http') ? url : null, localUrl: url.startsWith('data:') ? url : null, remoteUrls: url.startsWith('http') ? [url] : [], source: url.startsWith('http') ? 'MyFitTrack Community' : 'local' };
  }
  const files = [input.startImage, input.endImage].filter((file): file is File => Boolean(file));
  if (!files.length) return undefined;
  const urls = await Promise.all(files.map((file, index) => upload(exerciseId, index === 0 ? 'inicio' : 'final', file)));
  const localUrl = urls.find((url) => url.startsWith('data:')) ?? null;
  const hosted = urls.every((url) => url.startsWith('http'));
  return { type: 'image', remoteUrl: hosted ? urls[0] : null, remoteUrls: urls, localUrl, source: hosted ? 'MyFitTrack Community' : 'local' };
}

async function fileFromDataUrl(value: string, name: string): Promise<File> {
  const blob = await fetch(value).then((response) => response.blob());
  return new File([blob], name, { type: blob.type });
}

/** Envia uma publicacao criada offline e cria a copia comunitaria. */
export async function publishPendingExercise(exercise: Exercise): Promise<void> {
  if (!supabase || typeof navigator === 'undefined' || !navigator.onLine) throw new Error('Conecte-se à internet para publicar.');
  let media = exercise.media;
  if (media?.localUrl?.startsWith('data:')) {
    if (media.type === 'video') {
      media = await buildCustomExerciseMedia(exercise.id, { video: await fileFromDataUrl(media.localUrl, 'execucao.mp4') });
    } else {
      const localImages = (media.remoteUrls ?? [media.localUrl]).filter((url) => url.startsWith('data:'));
      media = await buildCustomExerciseMedia(exercise.id, {
        startImage: localImages[0] ? await fileFromDataUrl(localImages[0], 'inicio.jpg') : null,
        endImage: localImages[1] ? await fileFromDataUrl(localImages[1], 'final.jpg') : null,
      });
    }
  }
  const updated: Exercise = { ...exercise, media, pendingPublication: false, updatedAt: nowISO() };
  await exerciseRepo.put(updated);
  await communityExerciseRepo.put({
    ...updated,
    id: stableUuid(`community:${exercise.id}`), userId: null, visibility: 'community',
    sourceExerciseId: exercise.id,
  });
}
