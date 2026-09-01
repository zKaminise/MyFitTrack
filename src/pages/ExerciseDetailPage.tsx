import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCommunityPublication, useExercise, useExercises, useCompletedSessions } from '@/hooks/useData';
import { BackHeader } from '@/ui/PageHeader';
import { ExerciseLineChart } from '@/components/Charts';
import { ExerciseMedia } from '@/components/ExerciseMedia';
import { BodyMap } from '@/components/BodyMap';
import { ExercisePicker } from '@/components/ExercisePicker';
import { toast } from '@/ui/feedback';
import { exerciseHistory, exerciseChartData, collectExercisePoints, computeBests } from '@/services/history';
import { MUSCLE_LABEL, EQUIPMENT_LABEL, formatNumber } from '@/lib/labels';
import { shortDate, longDate } from '@/domain/dates';
import { useSettings, isFavorite } from '@/store/settingsStore';
import { exerciseRepo } from '@/repositories/dexie';
import { nowISO } from '@/lib/id';
import type { Exercise } from '@/domain/types';
import { publishPendingExercise } from '@/services/exerciseMediaUpload';
import { useAuth } from '@/store/authStore';
import { CustomExerciseSheet } from '@/components/CustomExerciseSheet';

type Metric = 'maxWeight' | 'volume' | 'est1rm';

export default function ExerciseDetailPage() {
  const { id } = useParams();
  const exercise = useExercise(id);
  const publication = useCommunityPublication(id);
  const allExercises = useExercises();
  const sessions = useCompletedSessions();
  const settings = useSettings((s) => s.settings);
  const toggleFav = useSettings((s) => s.toggleFavorite);
  const fav = isFavorite(settings, id ?? '');
  const [metric, setMetric] = useState<Metric>('maxWeight');
  const [addAlt, setAddAlt] = useState(false);
  const [editing, setEditing] = useState(false);
  const user = useAuth((state) => state.user);

  const history = useMemo(() => (id ? exerciseHistory(sessions, id) : []), [sessions, id]);
  const chart = useMemo(() => (id ? exerciseChartData(sessions, id) : []), [sessions, id]);
  const bests = useMemo(() => (id ? computeBests(collectExercisePoints(sessions, id)) : null), [sessions, id]);

  if (!exercise) return <div className="screen"><BackHeader title="Exercicio" /><p className="empty">Carregando...</p></div>;

  const exMap = new Map(allExercises.map((e) => [e.id, e]));
  const last = history[0];
  const canEdit = exercise.isCustom
    && exercise.visibility !== 'community'
    && exercise.userId === user?.id;
  const isPublished = publication?.visibility === 'community';
  const publicationState = publication === undefined ? undefined : isPublished;

  async function updateAlts(ids: string[]) {
    await exerciseRepo.put({ ...exercise!, alternativeIds: ids, updatedAt: nowISO() });
  }

  const metricLabel: Record<Metric, string> = { maxWeight: 'Carga maxima', volume: 'Volume', est1rm: '1RM estimado' };

  return (
    <div className="screen">
      <BackHeader
        title="Exercicio"
        right={<div className="row" style={{ gap: 6 }}>{canEdit && <button className="btn btn--sm" onClick={() => setEditing(true)}>Editar</button>}<button className="icon-btn" onClick={() => toggleFav(exercise.id)} style={{ color: fav ? 'var(--yellow)' : 'var(--text-faint)' }}>{fav ? '★' : '☆'}</button></div>}
      />

      <ExerciseMedia exercise={exercise} />
      {exercise.pendingPublication && <button className="btn btn--primary btn--block" style={{ marginTop: 10 }} onClick={() => void publishPendingExercise(exercise).then(() => toast('✓ Exercício publicado')).catch((error) => toast(error instanceof Error ? error.message : 'Não foi possível publicar'))}>☁ Publicar exercício agora</button>}
      <div style={{ marginTop: 12 }}>
        <h2 style={{ fontSize: 24 }}>{exercise.name}</h2>
        <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
          <span className="pill pill--accent">{MUSCLE_LABEL[exercise.primaryMuscle]}</span>
          {exercise.secondaryMuscles.map((m) => <span key={m} className="pill">{MUSCLE_LABEL[m]}</span>)}
          <span className="pill">{EQUIPMENT_LABEL[exercise.equipment]}</span>
          {canEdit && isPublished && <span className="pill pill--accent">Compartilhado</span>}
          {exercise.visibility === 'community' && <span className="pill">Criado por {exercise.authorName ?? 'membro da comunidade'}</span>}
        </div>
      </div>

      <div className="section-title">Musculos trabalhados</div>
      <div className="card">
        <BodyMap primary={exercise.primaryMuscle} secondary={exercise.secondaryMuscles} />
        <div className="divider" />
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <span className="legend-dot" style={{ background: '#ff7a1a' }} />
          <strong style={{ fontSize: 13 }}>PRINCIPAL</strong>
          <span className="muted" style={{ fontSize: 14 }}>{MUSCLE_LABEL[exercise.primaryMuscle]}</span>
        </div>
        {exercise.secondaryMuscles.length > 0 && (
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="legend-dot" style={{ background: '#f5c542' }} />
            <strong style={{ fontSize: 13 }}>SECUNDARIOS</strong>
            <span className="muted" style={{ fontSize: 14 }}>{exercise.secondaryMuscles.map((m) => MUSCLE_LABEL[m]).join(', ')}</span>
          </div>
        )}
      </div>

      {(exercise.instructionsList?.length || exercise.instructions) && (
        <>
          <div className="section-title">Como executar</div>
          <div className="card">
            {exercise.instructionsList?.length ? (
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {exercise.instructionsList.map((step, i) => (
                  <li key={i} style={{ fontSize: 15 }}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="muted" style={{ margin: 0 }}>{exercise.instructions}</p>
            )}
          </div>
        </>
      )}

      {last && (
        <>
          <div className="section-title" style={{ marginTop: 0 }}>Ultima vez</div>
          <div className="card">
            <div className="faint" style={{ fontSize: 13 }}>{longDate(last.date)}</div>
            <div className="stack-sm" style={{ marginTop: 6 }}>
              {last.sets.map((s, i) => (
                <div key={i} className="row-between" style={{ fontSize: 15 }}>
                  <span className="faint">Serie {i + 1}</span>
                  <span>{s.weight ?? '—'} × {s.reps ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {bests && bests.maxWeight > 0 && (
        <>
          <div className="section-title">Recordes</div>
          <div className="stat-grid">
            <div className="stat"><div className="stat-val">{bests.bestSet ? `${bests.bestSet.weight}×${bests.bestSet.reps}` : '—'}</div><div className="stat-lbl">Melhor serie</div></div>
            <div className="stat"><div className="stat-val">{bests.maxWeight} kg</div><div className="stat-lbl">Maior carga</div></div>
            <div className="stat"><div className="stat-val">{formatNumber(bests.maxVolumeSet)}</div><div className="stat-lbl">Maior volume (serie)</div></div>
            <div className="stat"><div className="stat-val">{Math.round(bests.best1rm)} kg</div><div className="stat-lbl">Melhor 1RM est.</div></div>
          </div>
        </>
      )}

      {chart.length > 1 && (
        <>
          <div className="section-title">Evolucao</div>
          <div className="chips" style={{ marginBottom: 8 }}>
            {(['maxWeight', 'volume', 'est1rm'] as Metric[]).map((m) => (
              <button key={m} className={`chip ${metric === m ? 'active' : ''}`} onClick={() => setMetric(m)}>{metricLabel[m]}</button>
            ))}
          </div>
          <div className="card">
            <ExerciseLineChart data={chart.map((c) => ({ date: shortDate(c.date), value: c[metric] }))} dataKey="value" />
            {metric === 'est1rm' && <p className="faint center" style={{ fontSize: 12 }}>1RM estimado (formula de Epley) — nao e 1RM real.</p>}
          </div>
        </>
      )}

      {exercise.visibility !== 'community' && <>
      <div className="section-title">Alternativas preferidas</div>
      <p className="faint" style={{ fontSize: 13, marginTop: 0 }}>Aparecem primeiro em "Substituir somente hoje".</p>
      <div className="stack-sm">
        {exercise.alternativeIds.map((altId) => {
          const alt = exMap.get(altId);
          if (!alt) return null;
          return (
            <div key={altId} className="list-item">
              <div className="grow"><div className="li-title">{alt.name}</div><div className="li-sub">{MUSCLE_LABEL[alt.primaryMuscle]}</div></div>
              <button className="icon-btn btn--danger" onClick={() => updateAlts(exercise.alternativeIds.filter((x) => x !== altId))}>✕</button>
            </div>
          );
        })}
        <button className="btn btn--block" onClick={() => setAddAlt(true)}>+ Adicionar alternativa</button>
      </div>
      </>}

      {history.length > 1 && (
        <>
          <div className="section-title">Historico completo</div>
          <div className="stack-sm">
            {history.map((h) => (
              <div key={h.sessionId} className="card">
                <div className="faint" style={{ fontSize: 12, fontWeight: 700 }}>{shortDate(h.date)}</div>
                <div className="row wrap" style={{ gap: 8, marginTop: 4 }}>
                  {h.sets.map((s, i) => <span key={i} className="pill">{s.weight ?? '—'} × {s.reps ?? '—'}</span>)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ExercisePicker
        open={addAlt}
        onClose={() => setAddAlt(false)}
        title="Adicionar alternativa"
        onPick={(alt: Exercise) => {
          if (alt.id === exercise.id) { toast('Escolha um exercicio diferente'); return; }
          if (!exercise.alternativeIds.includes(alt.id)) updateAlts([...exercise.alternativeIds, alt.id]);
          setAddAlt(false);
        }}
      />
      {editing && (
        <CustomExerciseSheet
          exercise={exercise}
          published={publicationState}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
    </div>
  );
}
