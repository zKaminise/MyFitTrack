import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExercises } from '@/hooks/useData';
import { BackHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/components';
import { toast } from '@/ui/feedback';
import type { Equipment, Exercise, MuscleGroup } from '@/domain/types';
import { MUSCLE_LABEL, MUSCLE_ORDER, EQUIPMENT_LABEL, EQUIPMENT_ORDER } from '@/lib/labels';
import { normalizeText } from '@/lib/text';
import { createCustomExercise } from '@/services/workoutService';
import { exerciseRepo } from '@/repositories/dexie';
import { ExerciseThumb } from '@/components/ExerciseMedia';
import { useSettings, isFavorite } from '@/store/settingsStore';

type Filter = 'all' | 'fav' | 'custom' | MuscleGroup;

export default function ExerciseLibraryPage() {
  const nav = useNavigate();
  const exercises = useExercises();
  const settings = useSettings((s) => s.settings);
  const toggleFavorite = useSettings((s) => s.toggleFavorite);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    let list = exercises.filter((e) => !e.deletedAt);
    if (filter === 'fav') list = list.filter((e) => isFavorite(settings, e.id));
    else if (filter === 'custom') list = list.filter((e) => e.isCustom);
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
              <div className="li-sub">{MUSCLE_LABEL[e.primaryMuscle]} · {EQUIPMENT_LABEL[e.equipment]}{e.isCustom ? ' · meu' : ''}</div>
            </button>
            <button className="icon-btn" onClick={() => toggleFavorite(e.id)} aria-label="Favoritar" style={{ color: isFavorite(settings, e.id) ? 'var(--yellow)' : 'var(--text-faint)' }}>
              {isFavorite(settings, e.id) ? '★' : '☆'}
            </button>
          </div>
        ))}
      </div>

      {creating && <CreateExerciseSheet onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); nav(`/exercises/${id}`); }} />}
    </div>
  );
}

function CreateExerciseSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState<MuscleGroup>('peito');
  const [equipment, setEquipment] = useState<Equipment>('maquina');
  const [instructions, setInstructions] = useState('');

  async function save() {
    if (!name.trim()) { toast('Informe o nome'); return; }
    const ex: Exercise = createCustomExercise({ name: name.trim(), primaryMuscle: primary, equipment, instructions: instructions.trim() || undefined });
    await exerciseRepo.put(ex);
    toast('Exercicio criado');
    onCreated(ex.id);
  }

  return (
    <Sheet open onClose={onClose} title="Criar meu exercicio">
      <div className="stack">
        <div className="field"><label>Nome</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="field">
          <label>Musculo principal</label>
          <select className="select" value={primary} onChange={(e) => setPrimary(e.target.value as MuscleGroup)}>
            {MUSCLE_ORDER.map((m) => <option key={m} value={m}>{MUSCLE_LABEL[m]}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Equipamento</label>
          <select className="select" value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
            {EQUIPMENT_ORDER.map((eq) => <option key={eq} value={eq}>{EQUIPMENT_LABEL[eq]}</option>)}
          </select>
        </div>
        <div className="field"><label>Instrucoes (opcional)</label><textarea className="textarea" value={instructions} onChange={(e) => setInstructions(e.target.value)} /></div>
        <button className="btn btn--primary btn--block" onClick={save}>Salvar exercicio</button>
      </div>
    </Sheet>
  );
}
