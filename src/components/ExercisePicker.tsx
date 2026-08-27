import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Sheet } from '@/ui/components';
import { useExercises } from '@/hooks/useData';
import type { Equipment, Exercise } from '@/domain/types';
import { MUSCLE_LABEL, MUSCLE_ORDER, EQUIPMENT_LABEL, EQUIPMENT_ORDER } from '@/lib/labels';
import { ExerciseThumb } from './ExerciseMedia';
import { ExercisePreviewSheet } from './ExercisePreviewSheet';
import { useSettings, isFavorite } from '@/store/settingsStore';
import {
  filterExercises,
  selectedExercisesInOrder,
  toggleExerciseSelection,
  type ExerciseFilter,
} from './exercisePickerModel';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick?: (exercise: Exercise) => void;
  onConfirm?: (exercises: Exercise[]) => void;
  title?: string;
  suggestedIds?: string[];
  multi?: boolean;
  existingIds?: string[];
}

export function ExercisePicker({
  open,
  onClose,
  onPick,
  onConfirm,
  title = 'Escolher exercício',
  suggestedIds,
  multi = false,
  existingIds = [],
}: Props) {
  const exercises = useExercises();
  const settings = useSettings((state) => state.settings);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ExerciseFilter>('all');
  const [equipment, setEquipment] = useState<Equipment | 'all'>('all');
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<Exercise | null>(null);
  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);

  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setPreview(null);
      setQuery('');
      setFilter('all');
      setEquipment('all');
    }
  }, [open]);

  const filtered = useMemo(
    () => filterExercises(
      exercises,
      { query, category: filter, equipment },
      (id) => isFavorite(settings, id),
    ),
    [exercises, query, filter, equipment, settings],
  );

  const suggested = (suggestedIds ?? [])
    .map((id) => exercises.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is Exercise => !!exercise);

  const choose = (exercise: Exercise) => {
    if (existingSet.has(exercise.id)) return;
    if (multi) {
      setSelectedIds((ids) => toggleExerciseSelection(ids, exercise.id));
      return;
    }
    onPick?.(exercise);
    onClose();
  };

  const confirm = () => {
    const selected = selectedExercisesInOrder(exercises, selectedIds);
    if (!selected.length) return;
    onConfirm?.(selected);
    if (!onConfirm) selected.forEach((exercise) => onPick?.(exercise));
  };

  const renderRow = (exercise: Exercise, key = exercise.id) => (
    <ExerciseRow
      key={key}
      exercise={exercise}
      favorite={isFavorite(settings, exercise.id)}
      selected={selectedIds.includes(exercise.id)}
      existing={existingSet.has(exercise.id)}
      multi={multi}
      onPreview={() => setPreview(exercise)}
      onToggle={() => choose(exercise)}
    />
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} title={title} className={`sheet--picker ${multi ? 'sheet--picker-multi' : ''}`}>
        <div className="picker-layout">
          <div className="picker-toolbar">
            <div className="picker-search">
              <span aria-hidden>⌕</span>
              <input
                placeholder="Buscar por nome, músculo ou equipamento"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
              />
              {query && <button onClick={() => setQuery('')} aria-label="Limpar busca">✕</button>}
            </div>
            <div className="chips picker-chips">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Todos</FilterChip>
              <FilterChip active={filter === 'fav'} onClick={() => setFilter('fav')}>★ Favoritos</FilterChip>
              <FilterChip active={filter === 'custom'} onClick={() => setFilter('custom')}>Meus</FilterChip>
              {MUSCLE_ORDER.map((muscle) => (
                <FilterChip key={muscle} active={filter === muscle} onClick={() => setFilter(muscle)}>{MUSCLE_LABEL[muscle]}</FilterChip>
              ))}
            </div>
            <button className={`equipment-filter ${equipment !== 'all' ? 'active' : ''}`} onClick={() => setEquipmentOpen((value) => !value)}>
              <span>⚙ Equipamento</span>
              <strong>{equipment === 'all' ? 'Todos' : EQUIPMENT_LABEL[equipment]}</strong>
              <span>{equipmentOpen ? '⌃' : '⌄'}</span>
            </button>
            {equipmentOpen && (
              <div className="chips equipment-chips">
                <FilterChip active={equipment === 'all'} onClick={() => setEquipment('all')}>Todos</FilterChip>
                {EQUIPMENT_ORDER.map((item) => (
                  <FilterChip key={item} active={equipment === item} onClick={() => setEquipment(item)}>{EQUIPMENT_LABEL[item]}</FilterChip>
                ))}
              </div>
            )}
          </div>

          <div className="picker-results">
            {suggested.length > 0 && filter === 'all' && !query && equipment === 'all' && (
              <section>
                <div className="section-title">Alternativas preferidas</div>
                <div className="picker-grid">{suggested.map((exercise) => renderRow(exercise, `suggested-${exercise.id}`))}</div>
              </section>
            )}
            <div className="picker-result-head">
              <span>{filtered.length} exercícios</span>
              {selectedIds.length > 0 && <strong>{selectedIds.length} selecionado{selectedIds.length === 1 ? '' : 's'}</strong>}
            </div>
            {filtered.length === 0
              ? <p className="empty">Nenhum exercício encontrado. Tente outro termo ou filtro.</p>
              : <div className="picker-grid">{filtered.map((exercise) => renderRow(exercise))}</div>}
          </div>
        </div>

        {multi && (
          <div className="picker-cta">
            <span><strong>{selectedIds.length}</strong> exercício{selectedIds.length === 1 ? '' : 's'} selecionado{selectedIds.length === 1 ? '' : 's'}</span>
            <button className="btn btn--primary" disabled={!selectedIds.length} onClick={confirm}>
              ADICIONAR {selectedIds.length || ''} EXERCÍCIO{selectedIds.length === 1 ? '' : 'S'}
            </button>
          </div>
        )}
      </Sheet>
      <ExercisePreviewSheet exercise={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button className={`chip ${active ? 'active' : ''}`} onClick={onClick}>{children}</button>;
}

function ExerciseRow({
  exercise,
  favorite,
  selected,
  existing,
  multi,
  onPreview,
  onToggle,
}: {
  exercise: Exercise;
  favorite: boolean;
  selected: boolean;
  existing: boolean;
  multi: boolean;
  onPreview: () => void;
  onToggle: () => void;
}) {
  return (
    <article className={`picker-card ${selected ? 'is-selected' : ''} ${existing ? 'is-existing' : ''}`}>
      <button className="picker-card__preview" onClick={onPreview} aria-label={`Visualizar ${exercise.name}`}>
        <ExerciseThumb exercise={exercise} size={64} />
        <span className="picker-card__copy">
          <strong>{favorite && <span className="picker-favorite">★ </span>}{exercise.name}</strong>
          <span>{MUSCLE_LABEL[exercise.primaryMuscle]}</span>
          <small>{EQUIPMENT_LABEL[exercise.equipment]}{exercise.isCustom ? ' · Meu exercício' : ''}</small>
        </span>
      </button>
      {existing ? (
        <span className="picker-existing">Já está no treino</span>
      ) : (
        <button
          className={`picker-select ${selected ? 'is-selected' : ''}`}
          onClick={onToggle}
          aria-label={selected ? `Desmarcar ${exercise.name}` : `${multi ? 'Selecionar' : 'Escolher'} ${exercise.name}`}
          aria-pressed={selected}
        >
          {selected ? '✓' : '+'}
        </button>
      )}
    </article>
  );
}
