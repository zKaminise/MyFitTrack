import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession as useSessionData } from '@/hooks/useData';
import { BackHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/components';
import { confirmAction, toast } from '@/ui/feedback';
import type { Session, SetLog } from '@/domain/types';
import { sessionVolume, sessionCompletedSets, sessionDurationMinutes } from '@/domain/volume';
import { longDate, relativeDays } from '@/domain/dates';
import { EFFORT_LABEL, formatMinutes, formatNumber, repRange } from '@/lib/labels';
import { nowISO } from '@/lib/id';
import { recalcAllPRs } from '@/services/prService';
import { sessionRepo } from '@/repositories/dexie';

export default function SessionDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const session = useSessionData(id);
  const [editing, setEditing] = useState(false);

  if (!session) return <div className="screen"><BackHeader title="Sessao" /><p className="empty">Carregando...</p></div>;

  const vol = sessionVolume(session);
  const dur = sessionDurationMinutes(session);

  async function saveEdits(next: Session) {
    await sessionRepo.put({ ...next, updatedAt: nowISO() });
    await recalcAllPRs();
    toast('Sessao atualizada');
    setEditing(false);
  }

  async function remove() {
    const ok = await confirmAction({
      title: 'Excluir esta sessao?',
      message: 'Isso removera este treino do historico e recalculara suas estatisticas.',
      danger: true,
      confirmLabel: 'Excluir sessao',
    });
    if (!ok) return;
    await sessionRepo.remove(session!.id);
    await recalcAllPRs();
    nav('/history');
  }

  return (
    <div className="screen">
      <BackHeader
        title={session.workoutName}
        right={<button className="icon-btn" onClick={() => setEditing(true)} aria-label="Editar">✎</button>}
      />

      <div className="hero" style={{ marginBottom: 14 }}>
        <div className="faint" style={{ fontSize: 13 }}>{longDate(session.date)} · {relativeDays(session.date)}</div>
        <h2 style={{ fontSize: 22, margin: '4px 0' }}>Treino concluido</h2>
        <div className="stat-grid" style={{ marginTop: 10 }}>
          <div className="stat"><div className="stat-val">{formatMinutes(dur * 60)}</div><div className="stat-lbl">Duracao</div></div>
          <div className="stat"><div className="stat-val">{session.exercises.length}</div><div className="stat-lbl">Exercicios</div></div>
          <div className="stat"><div className="stat-val">{sessionCompletedSets(session)}</div><div className="stat-lbl">Series</div></div>
          <div className="stat"><div className="stat-val">{formatNumber(vol)}</div><div className="stat-lbl">Volume (kg)</div></div>
        </div>
        {session.perceivedEffort && <p className="muted" style={{ marginTop: 10 }}>Percepcao: <strong>{EFFORT_LABEL[session.perceivedEffort]}</strong></p>}
        {session.periodizationWeekName && <span className="pill pill--accent">{session.periodizationWeekName}</span>}
        {session.note && <p className="faint" style={{ marginTop: 8 }}>📝 {session.note}</p>}
      </div>

      <div className="stack-sm">
        {[...session.exercises].sort((a, b) => a.order - b.order).map((ex) => (
          <div key={ex.id} className="card">
            <div className="row" style={{ gap: 6 }}>
              <strong>{ex.performedExerciseName}</strong>
              {ex.substituted && <span className="pill pill--accent">trocado</span>}
              {ex.status === 'skipped' && <span className="pill pill--red">pulado</span>}
            </div>
            {ex.substituted && (
              <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>
                Planejado: {ex.plannedExerciseName} → Executado: {ex.performedExerciseName}
              </div>
            )}
            {ex.reason && <div className="faint" style={{ fontSize: 12 }}>Motivo: {ex.reason}</div>}
            {ex.status !== 'skipped' && (
              <div className="stack-sm" style={{ marginTop: 8 }}>
                {ex.sets.filter((s) => s.completed).map((s) => (
                  <div key={s.id} className="row-between" style={{ fontSize: 14 }}>
                    <span className="faint">Serie {s.setIndex}</span>
                    <span>{s.weight ?? '—'} kg × {s.reps ?? '—'}</span>
                  </div>
                ))}
                {ex.sets.every((s) => !s.completed) && <span className="faint" style={{ fontSize: 13 }}>Nenhuma serie registrada.</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="btn btn--danger btn--block" style={{ marginTop: 16 }} onClick={remove}>Excluir sessao</button>

      {editing && <EditSheet session={session} onClose={() => setEditing(false)} onSave={saveEdits} />}
    </div>
  );
}

function EditSheet({ session, onClose, onSave }: { session: Session; onClose: () => void; onSave: (s: Session) => void }) {
  const [draft, setDraft] = useState<Session>(structuredClone(session));

  const updateSet = (exId: string, setId: string, patch: Partial<SetLog>) =>
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex) =>
        ex.id === exId ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) } : ex,
      ),
    }));

  return (
    <Sheet open onClose={onClose} title="Editar sessao">
      <p className="faint" style={{ fontSize: 13, marginTop: 0 }}>
        Corrija valores digitados por engano. Volume, recordes e graficos serao recalculados.
      </p>
      <div className="stack" style={{ marginTop: 8 }}>
        {draft.exercises.map((ex) => (
          <div key={ex.id} className="card">
            <strong>{ex.performedExerciseName}</strong>
            <span className="muted" style={{ fontSize: 12, display: 'block' }}>Meta {ex.targetSets} × {repRange(ex.repMin, ex.repMax)}</span>
            <table className="set-table" style={{ marginTop: 8 }}>
              <thead><tr><th>#</th><th>Peso</th><th>Reps</th><th>✓</th></tr></thead>
              <tbody>
                {ex.sets.map((s) => (
                  <tr key={s.id} className={s.completed ? 'set-row--done' : ''}>
                    <td className="set-idx">{s.setIndex}</td>
                    <td><input className="set-input" type="number" value={s.weight ?? ''} onChange={(e) => updateSet(ex.id, s.id, { weight: e.target.value === '' ? null : Number(e.target.value) })} /></td>
                    <td><input className="set-input" type="number" value={s.reps ?? ''} onChange={(e) => updateSet(ex.id, s.id, { reps: e.target.value === '' ? null : Number(e.target.value) })} /></td>
                    <td><button className={`check-btn ${s.completed ? 'done' : ''}`} onClick={() => updateSet(ex.id, s.id, { completed: !s.completed })}>✓</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label>Observacao</label>
        <textarea className="textarea" value={draft.note ?? ''} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} />
      </div>
      <div className="stack-sm" style={{ marginTop: 14 }}>
        <button className="btn btn--primary btn--block" onClick={() => onSave(draft)}>Salvar alteracoes</button>
        <button className="btn btn--block btn--ghost" onClick={onClose}>Cancelar</button>
      </div>
    </Sheet>
  );
}
