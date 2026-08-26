// Resolucao de midia de um exercicio com cadeia de fallback: gif -> video ->
// image -> placeholder. Nunca quebra a tela.
import type { Exercise, MediaType } from '@/domain/types';

export interface ResolvedMedia {
  type: MediaType;
  url?: string;
  /** Todas as URLs remotas (para cache offline). */
  urls: string[];
}

function guessType(url: string): MediaType {
  const u = url.toLowerCase();
  if (u.endsWith('.gif')) return 'gif';
  if (u.endsWith('.mp4') || u.endsWith('.webm')) return 'video';
  return 'image';
}

export function resolveMedia(ex: Exercise): ResolvedMedia {
  const m = ex.media;
  if (m && m.type !== 'none') {
    const urls = (m.remoteUrls && m.remoteUrls.length ? m.remoteUrls : [m.remoteUrl])
      .filter((u): u is string => !!u);
    const url = m.localUrl || urls[0];
    if (url) return { type: m.type, url, urls };
  }
  // Legado
  if (ex.mediaUrl) return { type: guessType(ex.mediaUrl), url: ex.mediaUrl, urls: [ex.mediaUrl] };
  return { type: 'none', urls: [] };
}

/** URLs remotas de midia de um conjunto de exercicios (para preparar offline). */
export function collectMediaUrls(exercises: Exercise[]): string[] {
  const set = new Set<string>();
  for (const ex of exercises) {
    for (const u of resolveMedia(ex).urls) {
      if (u.startsWith('http')) set.add(u);
    }
  }
  return [...set];
}
