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
import { communityExerciseRepo, exerciseRepo } from '@/repositories/dexie';
import { ExerciseThumb } from '@/components/ExerciseMedia';
import { useSettings, isFavorite } from '@/store/settingsStore';
import { useAuth } from '@/store/authStore';
import { buildCustomExerciseMedia } from '@/services/exerciseMediaUpload';
import { stableUuid } from '@/lib/id';

type Filter = 'all' | 'fav' | 'custom' | 'community' | MuscleGroup;

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
  const user = useAuth((state) => state.user);
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState<MuscleGroup>('peito');
  const [equipment, setEquipment] = useState<Equipment>('maquina');
  const [instructions, setInstructions] = useState('');
  const [startImage, setStartImage] = useState<File | null>(null);
  const [endImage, setEndImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [publish, setPublish] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { toast('Informe o nome'); return; }
    setSaving(true);
    try {
      let ex: Exercise = createCustomExercise({
        name: name.trim(), primaryMuscle: primary, equipment,
        instructions: instructions.trim() || undefined,
        instructionsList: instructions.split(/\r?\n/).map((step) => step.trim()).filter(Boolean),
        authorId: user?.id ?? null, authorName: user?.name ?? null,
      });
      const media = await buildCustomExerciseMedia(ex.id, { startImage, endImage, video });
      if (media) ex = { ...ex, media };
      const publishNow = publish && user && !(media?.localUrl?.startsWith('data:'));
      ex = { ...ex, pendingPublication: Boolean(publish && !publishNow) };
      await exerciseRepo.put(ex);
      if (publishNow && user) {
        await communityExerciseRepo.put({
          ...ex,
          id: stableUuid(`community:${ex.id}`),
          userId: null,
          visibility: 'community',
          authorId: user.id,
          authorName: user.name,
          sourceExerciseId: ex.id,
        });
      }
      toast(publishNow ? 'Exercício criado e publicado' : publish ? 'Salvo no dispositivo; publique quando estiver online' : 'Exercício privado criado');
      onCreated(ex.id);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível criar o exercício');
    } finally {
      setSaving(false);
    }
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
        <div className="field"><label>Como executar</label><textarea className="textarea" value={instructions} placeholder="Escreva um passo por linha..." onChange={(e) => setInstructions(e.target.value)} /></div>
        <div className="custom-media-fields">
          <label><span>Imagem inicial</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setStartImage(e.target.files?.[0] ?? null)} /><small>{startImage?.name ?? 'JPG, PNG, WebP ou GIF'}</small></label>
          <label><span>Imagem final</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setEndImage(e.target.files?.[0] ?? null)} /><small>{endImage?.name ?? 'Opcional'}</small></label>
          <label className="custom-media-video"><span>Ou vídeo da execução</span><input type="file" accept="video/mp4,video/webm" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} /><small>{video?.name ?? 'MP4 ou WebM, até 15 MB'}</small></label>
        </div>
        <label className="publish-exercise-toggle"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /><span><strong>Disponibilizar para outros usuários</strong><small>Seu nome aparecerá como autor. Use somente mídia própria ou autorizada.</small></span></label>
        <button className="btn btn--primary btn--block" disabled={saving} onClick={save}>{saving ? 'ENVIANDO...' : publish ? 'SALVAR E PUBLICAR' : 'SALVAR EXERCÍCIO'}</button>
      </div>
    </Sheet>
  );
}
