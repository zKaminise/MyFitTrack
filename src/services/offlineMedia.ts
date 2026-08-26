// Cache de midia para uso offline (Cache Storage).
// Estrategia: "preparar meus treinos para uso offline" — baixa as midias dos
// exercicios presentes nos treinos, sem baixar a biblioteca inteira.
// O mesmo cacheName e usado pelo service worker (runtimeCaching) para que a
// midia visualizada online tambem fique disponivel offline (cache sob demanda).
import { db } from '@/db/database';
import { collectMediaUrls } from '@/lib/media';
import { getCurrentUserId } from '@/repositories/context';

export const MEDIA_CACHE = 'exercise-media';

function cachesAvailable(): boolean {
  return typeof caches !== 'undefined';
}

export async function isCached(url: string): Promise<boolean> {
  if (!cachesAvailable()) return false;
  const cache = await caches.open(MEDIA_CACHE);
  return (await cache.match(url)) != null;
}

export async function countCached(urls: string[]): Promise<number> {
  if (!cachesAvailable() || urls.length === 0) return 0;
  const cache = await caches.open(MEDIA_CACHE);
  let n = 0;
  for (const url of urls) if (await cache.match(url)) n++;
  return n;
}

export interface PrepareProgress {
  done: number;
  total: number;
}

export interface PrepareResult {
  total: number;
  cached: number;
  failed: number;
}

/** Baixa e cacheia as URLs ainda nao cacheadas. */
export async function prepareMedia(
  urls: string[],
  onProgress?: (p: PrepareProgress) => void,
): Promise<PrepareResult> {
  if (!cachesAvailable()) return { total: urls.length, cached: 0, failed: urls.length };
  const cache = await caches.open(MEDIA_CACHE);
  let cached = 0;
  let failed = 0;
  let done = 0;
  for (const url of urls) {
    try {
      if (await cache.match(url)) {
        cached++;
      } else {
        const res = await fetch(url, { mode: 'cors' });
        if (res.ok) {
          await cache.put(url, res.clone());
          cached++;
        } else {
          failed++;
        }
      }
    } catch {
      failed++;
    }
    done++;
    onProgress?.({ done, total: urls.length });
  }
  return { total: urls.length, cached, failed };
}

/** URLs de midia dos exercicios usados nos treinos (nao arquivados). */
export async function workoutMediaUrls(): Promise<string[]> {
  const uid = getCurrentUserId();
  const [workouts, exercises] = await Promise.all([
    uid ? db.workouts.where('userId').equals(uid).toArray() : Promise.resolve([]),
    db.exercises.toArray(),
  ]);
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const used = new Set<string>();
  for (const w of workouts) {
    if (w.archived) continue;
    for (const we of w.exercises) used.add(we.exerciseId);
  }
  const usedExercises = [...used].map((id) => exMap.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
  return collectMediaUrls(usedExercises);
}

/** Limpa todo o cache de midia. */
export async function clearMediaCache(): Promise<void> {
  if (!cachesAvailable()) return;
  await caches.delete(MEDIA_CACHE);
}
