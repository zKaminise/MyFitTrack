import { useMemo, useState } from 'react';
import { Sheet } from '@/ui/components';
import { useExercises } from '@/hooks/useData';
import type { Exercise, MuscleGroup } from '@/domain/types';
import { MUSCLE_LABEL, MUSCLE_ORDER, EQUIPMENT_LABEL } from '@/lib/labels';
import { normalizeText } from '@/lib/text';
import { ExerciseThumb } from './ExerciseMedia';
import { useSettings, isFavorite } from '@/store/settingsStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
  title?: string;
  /** Ids sugeridos no topo (ex: alternativas preferidas). */
  suggestedIds?: string[];
  /** Se true, o seletor permanece aberto apos escolher (adicionar varios). */
  multi?: boolean;
}

type Filter = 'all' | 'fav' | 'custom' | MuscleGroup;

export function ExercisePicker({ open, onClose, onPick, title = 'Escolher exercicio', suggestedIds, multi }: Props) {
  const exercises = useExercises();
  const settings = useSettings((s) => s.settings);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    let list = exercises.filter((e) => !e.deletedAt);
    if (filter === 'fav') list = list.filter((e) => isFavorite(settings, e.id));
    else if (filter === 'custom') list = list.filter((e) => e.isCustom);
    else if (filter !== 'all') list = list.filter((e) => e.primaryMuscle === filter);
    if (q) {
      list = list.filter(
        (e) =>
          normalizeText(e.name).includes(q) ||
          e.aliases.some((a) => normalizeText(a).includes(q)) ||
          normalizeText(EQUIPMENT_LABEL[e.equipment]).includes(q) ||
          normalizeText(MUSCLE_LABEL[e.primaryMuscle]).includes(q),
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query, filter, settings]);

  const suggested = (suggestedIds ?? [])
    .map((id) => exercises.find((e) => e.id === id))
    .filter((e): e is Exercise => !!e);

  const pick = (e: Exercise) => {
    onPick(e);
    if (!multi) onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <input
        className="input"
        placeholder="Buscar exercicio..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="chips" style={{ margin: '12px 0' }}>
        <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
        <button className={`chip ${filter === 'fav' ? 'active' : ''}`} onClick={() => setFilter('fav')}>★ Favoritos</button>
        <button className={`chip ${filter === 'custom' ? 'active' : ''}`} onClick={() => setFilter('custom')}>Meus</button>
        {MUSCLE_ORDER.map((m) => (
          <button key={m} className={`chip ${filter === m ? 'active' : ''}`} onClick={() => setFilter(m)}>
            {MUSCLE_LABEL[m]}
          </button>
        ))}
      </div>

      {suggested.length > 0 && filter === 'all' && !query && (
        <>
          <div className="section-title" style={{ marginTop: 0 }}>Alternativas preferidas</div>
          <div className="stack-sm" style={{ marginBottom: 12 }}>
            {suggested.map((e) => (
              <ExerciseRow key={`sug-${e.id}`} exercise={e} fav={isFavorite(settings, e.id)} onClick={() => pick(e)} />
            ))}
          </div>
          <div className="section-title">Todos</div>
        </>
      )}

      <div className="stack-sm">
        {filtered.length === 0 && <p className="empty">Nenhum exercicio encontrado.</p>}
        {filtered.map((e) => (
          <ExerciseRow key={e.id} exercise={e} fav={isFavorite(settings, e.id)} onClick={() => pick(e)} />
        ))}
      </div>
    </Sheet>
  );
}

function ExerciseRow({ exercise, fav, onClick }: { exercise: Exercise; fav: boolean; onClick: () => void }) {
  return (
    <button className="list-item card-tap" onClick={onClick}>
      <ExerciseThumb exercise={exercise} />
      <div className="grow">
        <div className="li-title">
          {fav && '★ '}
          {exercise.name}
        </div>
        <div className="li-sub">
          {MUSCLE_LABEL[exercise.primaryMuscle]} · {EQUIPMENT_LABEL[exercise.equipment]}
          {exercise.isCustom && ' · meu'}
        </div>
      </div>
      <span className="faint">+</span>
    </button>
  );
}
