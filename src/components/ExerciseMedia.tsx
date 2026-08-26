import { useState } from 'react';
import type { Exercise } from '@/domain/types';
import { resolveMedia } from '@/lib/media';

/** Placeholder padrao quando nao ha midia. */
function Placeholder({ large }: { large?: boolean }) {
  return (
    <div
      className="media-placeholder"
      style={{ fontSize: large ? 48 : 22 }}
      aria-label="Sem demonstracao"
    >
      🏋️
    </div>
  );
}

/**
 * Midia grande (tela de detalhes). Imagem/GIF com skeleton e fallback.
 * GIFs iniciam automaticamente e repetem; videos ficam mudos, em loop.
 */
export function ExerciseMedia({ exercise }: { exercise: Exercise }) {
  const media = resolveMedia(exercise);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // Alterna entre posicao inicial/final quando ha 2 imagens (demonstracao).
  const [frame, setFrame] = useState(0);

  if (media.type === 'none' || failed) {
    return <div className="media-box"><Placeholder large /></div>;
  }

  if (media.type === 'video') {
    return (
      <div className="media-box">
        <video
          className="media-el"
          src={media.url}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
        {!loaded && <div className="media-skeleton" />}
      </div>
    );
  }

  // gif ou image
  const urls = media.urls.length ? media.urls : [media.url!];
  const src = urls[frame % urls.length];
  const canToggle = urls.length > 1;
  return (
    <div className="media-box">
      <img
        className="media-el"
        src={src}
        alt={exercise.name}
        loading="eager"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{ opacity: loaded ? 1 : 0 }}
      />
      {!loaded && <div className="media-skeleton" />}
      {canToggle && loaded && (
        <button
          className="media-frame-toggle"
          onClick={() => setFrame((f) => f + 1)}
          aria-label="Alternar posicao"
        >
          {frame % urls.length === 0 ? 'Inicio ›' : '‹ Final'}
        </button>
      )}
    </div>
  );
}

/**
 * Miniatura estatica para listas (lazy, sem animar dezenas de midias).
 */
export function ExerciseThumb({ exercise, size = 48 }: { exercise: Exercise; size?: number }) {
  const media = resolveMedia(exercise);
  const [failed, setFailed] = useState(false);
  const url = media.type !== 'none' ? media.url : undefined;
  return (
    <div className="media-thumb" style={{ width: size, height: size }}>
      {url && !failed ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <Placeholder />
      )}
    </div>
  );
}
