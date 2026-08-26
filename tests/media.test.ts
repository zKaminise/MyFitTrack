import { describe, it, expect } from 'vitest';
import { resolveMedia, collectMediaUrls } from '@/lib/media';
import type { Exercise } from '@/domain/types';

function ex(partial: Partial<Exercise>): Exercise {
  return {
    id: 'x', createdAt: '', updatedAt: '',
    name: 'Ex', aliases: [], primaryMuscle: 'peito', secondaryMuscles: [], equipment: 'maquina',
    isCustom: false, isFavorite: false, alternativeIds: [],
    ...partial,
  };
}

describe('resolucao de midia', () => {
  it('resolve midia do tipo image com multiplas urls', () => {
    const r = resolveMedia(ex({ media: { type: 'image', remoteUrl: 'a.jpg', remoteUrls: ['a.jpg', 'b.jpg'] } }));
    expect(r.type).toBe('image');
    expect(r.url).toBe('a.jpg');
    expect(r.urls).toEqual(['a.jpg', 'b.jpg']);
  });

  it('usa midia legada mediaUrl e infere o tipo', () => {
    expect(resolveMedia(ex({ mediaUrl: 'demo.gif' })).type).toBe('gif');
    expect(resolveMedia(ex({ mediaUrl: 'clip.mp4' })).type).toBe('video');
    expect(resolveMedia(ex({ mediaUrl: 'foto.png' })).type).toBe('image');
  });

  it('retorna none quando nao ha midia', () => {
    const r = resolveMedia(ex({ media: { type: 'none' } }));
    expect(r.type).toBe('none');
    expect(r.urls).toEqual([]);
  });

  it('collectMediaUrls deduplica e mantem apenas http', () => {
    const urls = collectMediaUrls([
      ex({ media: { type: 'image', remoteUrl: 'https://h/a.jpg', remoteUrls: ['https://h/a.jpg', 'https://h/b.jpg'] } }),
      ex({ media: { type: 'image', remoteUrl: 'https://h/a.jpg', remoteUrls: ['https://h/a.jpg'] } }),
      ex({ mediaUrl: 'blob:local' }),
    ]);
    expect(urls.sort()).toEqual(['https://h/a.jpg', 'https://h/b.jpg']);
  });
});
