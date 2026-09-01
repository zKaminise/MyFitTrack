import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommunityPublication, useExercises } from '@/hooks/useData';
import { BackHeader } from '@/ui/PageHeader';
import type { Exercise, MuscleGroup } from '@/domain/types';
import { MUSCLE_LABEL, MUSCLE_ORDER, EQUIPMENT_LABEL } from '@/lib/labels';
import { normalizeText } from '@/lib/text';
import { ExerciseThumb } from '@/components/ExerciseMedia';
import { useSettings, isFavorite } from '@/store/settingsStore';
import { CustomExerciseSheet } from '@/components/CustomExerciseSheet';

type Filter = 'all' | 'fav' | 'custom' | 'community' | MuscleGroup;

export default function ExerciseLibraryPage() {
  const nav = useNavigate();
  const exercises = useExercises();
  const settings = useSettings((s) => s.settings);
  const toggleFavorite = useSettings((s) => s.toggleFavorite);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const editingPublication = useCommunityPublication(editing?.id);

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    let list = exercises.filter((e) => !e.deletedAt);
    if (filter === 'fav') list = list.filter((e) => isFavorite(settings, e.id));
    else if (filter === 'custom') list = list.filter((e) => e.isCustom && e.visibility !== 'community');
    else if (filter === 'community') list = list.filter((e) => e.visibility === 'community');
    else if (filter !== 'all') list = list.filter((e) => e.primaryMuscle === filter);
    if (q) list = list.filter((e) => normalizeText(e.name).includes(q) || e.aliases.some((a) => normalizeText(a).includes(q)));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query, filter, settings]);

  return (
    <div className="screen">
      <BackHeader title="Exercicios" right={<button className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>+ Criar</button>} />
      <input className="input" placeholder="Buscar por nome, musculo, equipamento..." value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="chips" style={{ margin: '12px 0' }}>
        <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
        <button className={`chip ${filter === 'fav' ? 'active' : ''}`} onClick={() => setFilter('fav')}>★ Favoritos</button>
        <button className={`chip ${filter === 'custom' ? 'active' : ''}`} onClick={() => setFilter('custom')}>Meus</button>
        <button className={`chip ${filter === 'community' ? 'active' : ''}`} onClick={() => setFilter('community')}>Comunidade</button>
        {MUSCLE_ORDER.map((m) => (
          <button key={m} className={`chip ${filter === m ? 'active' : ''}`} onClick={() => setFilter(m)}>{MUSCLE_LABEL[m]}</button>
        ))}
      </div>

      <p className="faint" style={{ fontSize: 13 }}>{filtered.length} exercicio(s)</p>
      <div className="stack-sm">
        {filtered.map((e) => (
          <div key={e.id} className="list-item">
            <ExerciseThumb exercise={e} />
            <button className="grow" style={{ textAlign: 'left', background: 'none', color: 'inherit' }} onClick={() => nav(`/exercises/${e.id}`)}>
              <div className="li-title">{e.name}</div>
              <div className="li-sub">{MUSCLE_LABEL[e.primaryMuscle]} · {EQUIPMENT_LABEL[e.equipment]}{e.visibility === 'community' ? ` · por ${e.authorName ?? 'membro'}` : e.isCustom ? ' · meu' : ''}</div>
            </button>
            {e.isCustom && e.visibility !== 'community' && <button className="icon-btn" onClick={() => setEditing(e)} aria-label={`Editar ${e.name}`}>✎</button>}
            <button className="icon-btn" onClick={() => toggleFavorite(e.id)} aria-label="Favoritar" style={{ color: isFavorite(settings, e.id) ? 'var(--yellow)' : 'var(--text-faint)' }}>
              {isFavorite(settings, e.id) ? '★' : '☆'}
            </button>
          </div>
        ))}
      </div>

      {creating && <CustomExerciseSheet onClose={() => setCreating(false)} onSaved={(exercise) => { setCreating(false); nav(`/exercises/${exercise.id}`); }} />}
      {editing && <CustomExerciseSheet exercise={editing} published={editingPublication === undefined ? undefined : editingPublication?.visibility === 'community'} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
    </div>
  );
}
