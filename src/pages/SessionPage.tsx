import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/store/sessionStore';
import { useRestTimer } from '@/store/restTimer';
import { useSettings } from '@/store/settingsStore';
import { useExerciseMap, useSessions } from '@/hooks/useData';
import { RestTimerBar } from '@/components/RestTimer';
import { ExercisePicker } from '@/components/ExercisePicker';
import { Sheet } from '@/ui/components';
import { confirmAction, toast, vibrate } from '@/ui/feedback';
import type { Exercise, SessionExercise, SetLog, PerceivedEffort } from '@/domain/types';
import { findLastPerformance, lastWorkingSets, type LastPerformance } from '@/services/history';
import { performanceReferences, type SetReference } from '@/domain/performanceReference';
import { shortDate } from '@/domain/dates';
import { evaluateProgression, doubleProgressionHint } from '@/domain/progression';
import { sessionVolume, sessionCompletedSets, percentChange } from '@/domain/volume';
import { MUSCLE_LABEL, EFFORT_LABEL, EFFORT_ORDER, SET_TYPE_LABEL, repRange, formatDuration, formatNumber } from '@/lib/labels';
import { ExerciseThumb } from '@/components/ExerciseMedia';
import { SyncIndicator } from '@/components/SyncIndicator';

export default function SessionPage() {
  const nav = useNavigate();
  const active = useSession((s) => s.active);
  const exMap = useExerciseMap();
  const sessions = useSessions() ?? [];
  const { settings } = useSettings();
  const [now, setNow] = useState(Date.now());
  const [pickerFor, setPickerFor] = useState<string | null>(null); // exId sendo substituido
  const [addingExercise, setAddingExercise] = useState(false);
  const [menuFor, setMenuFor] = useState<SessionExercise | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!active) {
    return (
      <div className="screen center">
        <div className="empty">
          <span className="emoji">🏁</span>
          Nenhum treino em andamento.
          <div style={{ marginTop: 14 }}>
            <button className="btn btn--primary" onClick={() => nav('/')}>Voltar ao inicio</button>
          </div>
        </div>
      </div>
    );
  }

  const elapsed = Math.floor((now - new Date(active.startedAt).getTime()) / 1000);
  const exercises = [...active.exercises].sort((a, b) => a.order - b.order);
  const doneCount = exercises.filter((e) => e.status === 'completed').length;

  const substitute = (permanentHint: SessionExercise) => setPickerFor(permanentHint.id);

  return (
    <div className="screen screen--flush" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
      {/* Cabecalho da sessao */}
      <div className="card" style={{ position: 'sticky', top: 0, zIndex: 10, marginBottom: 14 }}>
        <div className="row-between">
          <div>
            <h2 style={{ fontSize: 20 }}>{active.workoutName}</h2>
            <span className="muted" style={{ fontSize: 13 }}>{active.workoutDescription}</span>
          </div>
          <div className="center">
            <div className="big-timer" style={{ fontSize: 28 }}>{formatDuration(elapsed)}</div>
            <div className="faint" style={{ fontSize: 12 }}>{doneCount} / {exercises.length} exercicios</div>
            <div style={{ marginTop: 6 }}><SyncIndicator /></div>
          </div>
        </div>
      </div>

      <div className="stack">
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            performed={exMap.get(ex.performedExerciseId)}
            previousSets={performanceReferences(sessions, ex.performedExerciseId, ex.sets, active.id)}
            lastPerformance={findLastPerformance(sessions, ex.performedExerciseId, active.id)}
            progressionSets={lastWorkingSets(sessions, ex.performedExerciseId, active.id)}
            onMenu={() => setMenuFor(ex)}
          />
        ))}
      </div>

      <div className="stack-sm" style={{ marginTop: 18 }}>
        <button className="btn btn--block" onClick={() => setAddingExercise(true)}>+ Adicionar exercicio</button>
        <button className="btn btn--primary btn--lg btn--block" onClick={() => setFinishing(true)}>
          FINALIZAR TREINO
        </button>
      </div>

      <RestTimerBar />

      {/* Substituir somente hoje */}
      <ExercisePicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        title="Substituir somente hoje"
        suggestedIds={
          pickerFor ? exMap.get(exercises.find((e) => e.id === pickerFor)?.performedExerciseId ?? '')?.alternativeIds : []
        }
        onPick={async (exercise) => {
          if (!pickerFor) return;
          const reason = await askReason();
          useSession.getState().substituteToday(pickerFor, exercise, reason);
          toast('Substituido apenas nesta sessao');
          setPickerFor(null);
        }}
      />

      {/* Adicionar exercicio somente hoje */}
      <ExercisePicker
        open={addingExercise}
        onClose={() => setAddingExercise(false)}
        title="Adicionar exercicio hoje"
        onPick={(exercise) => {
          useSession.getState().addExerciseToday(exercise, settings.defaultRestSeconds);
          setAddingExercise(false);
          toast('Exercicio adicionado a sessao');
        }}
      />

      {menuFor && (
        <ExerciseMenu
          ex={menuFor}
          onClose={() => setMenuFor(null)}
          onSubstituteToday={() => {
            const e = menuFor;
            setMenuFor(null);
            substitute(e);
          }}
        />
      )}

      {finishing && <FinishSheet onClose={() => setFinishing(false)} />}
    </div>
  );
}

async function askReason(): Promise<string | undefined> {
  // Motivo opcional simples (nao obriga). Reaproveita o confirm como "pular?".
  return undefined;
}

function ExerciseCard({
  ex,
  performed,
  previousSets,
  lastPerformance,
  progressionSets,
  onMenu,
}: {
  ex: SessionExercise;
  performed: Exercise | undefined;
  previousSets: (SetReference | null)[];
  lastPerformance: LastPerformance | null;
  progressionSets: Pick<SetLog, 'reps' | 'weight' | 'completed' | 'setType'>[];
  onMenu: () => void;
}) {
  const { settings } = useSettings();
  const store = useSession();
  const restTimer = useRestTimer();
  const nav = useNavigate();

  const skipped = ex.status === 'skipped';
  const firstTarget = ex.sets[0];
  const uniformTargets = ex.sets.every((set) =>
    (set.targetRepMin ?? ex.repMin) === (firstTarget?.targetRepMin ?? ex.repMin)
    && (set.targetRepMax ?? ex.repMax) === (firstTarget?.targetRepMax ?? ex.repMax),
  );

  const progression =
    progressionSets.length > 0 && uniformTargets
      ? (settings.useDoubleProgression ? doubleProgressionHint : evaluateProgression)({
          repMin: ex.repMin,
          repMax: ex.repMax,
          sets: progressionSets,
          thresholdPct: settings.progressionThresholdPct,
        })
      : null;

  function onCheck(set: SetLog) {
    const willComplete = !set.completed;
    store.toggleComplete(ex.id, set.id);
    if (willComplete) {
      vibrate(30, settings.vibration);
      const restSeconds = set.restSeconds ?? ex.restSeconds;
      if (settings.autoStartTimer && restSeconds > 0) restTimer.start(restSeconds);
    }
  }

  return (
    <div className={`card ${skipped ? '' : ''}`} style={skipped ? { opacity: 0.55 } : undefined}>
      <div className="row-between">
        <button
          className="row grow"
          style={{ gap: 10, background: 'none', color: 'inherit', textAlign: 'left', alignItems: 'center' }}
          onClick={() => nav(`/exercises/${ex.performedExerciseId}`)}
        >
          {performed && <ExerciseThumb exercise={performed} size={44} />}
          <div className="grow">
            <div className="row" style={{ gap: 6 }}>
              <h3 style={{ fontSize: 18 }}>{ex.performedExerciseName}</h3>
              {ex.substituted && <span className="pill pill--accent">trocado</span>}
              {skipped && <span className="pill pill--red">pulado</span>}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {performed ? MUSCLE_LABEL[performed.primaryMuscle] : ''} · {ex.targetSets} séries · metas individuais abaixo
            </span>
          </div>
        </button>
        <button className="icon-btn" onClick={onMenu} aria-label="Opcoes">⋮</button>
      </div>

      {ex.notes && <div className="exercise-session-note"><span>📝 Ponto de atenção</span><strong>{ex.notes}</strong></div>}

      {lastPerformance && <details className="performance-reference">
        <summary>Última execução · {lastPerformance.workoutName} · {shortDate(lastPerformance.date)}</summary>
        <p>Referências de todos os treinos, por tipo de série. A carga de hoje continua sendo sua escolha.</p>
        {lastPerformance.sets.map((set, index) => <div className="row-between" key={index}>
          <span>{set.setIndex} · {SET_TYPE_LABEL[set.setType]}</span>
          <strong>{set.weight ?? '—'} × {set.reps ?? '—'}</strong>
        </div>)}
      </details>}

      {progression && progression.direction !== 'insufficient' && (
        <div className={`badge-progress ${progression.direction === 'increase' ? 'increase' : progression.direction === 'reduce' ? 'reduce' : 'hold'}`} style={{ marginTop: 10 }}>
          <span className="bp-ico">{progression.direction === 'increase' ? '⬆' : progression.direction === 'reduce' ? '↓' : '→'}</span>
          <div>
            <strong>{progression.title}</strong>
            <div style={{ fontSize: 13 }}>{progression.message}</div>
          </div>
        </div>
      )}

      {!skipped && (
        <table className="set-table" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th style={{ width: 112 }}>Série / meta</th>
              <th>Anterior</th>
              <th>Peso</th>
              <th>Reps</th>
              <th style={{ width: 50 }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {ex.sets.map((set, i) => {
              const prev = previousSets[i];
              return (
                <tr key={set.id} className={set.completed ? 'set-row--done' : ''}>
                  <td className="set-idx set-target-cell"><strong>{set.setIndex}</strong><span>{SET_TYPE_LABEL[set.setType]}</span><small>{repRange(set.targetRepMin ?? ex.repMin, set.targetRepMax ?? ex.repMax)} reps · {set.restSeconds ?? ex.restSeconds}s</small>{set.intraSetRestSeconds ? <small>pausa interna {set.intraSetRestSeconds}s</small> : null}{set.prescriptionNotes ? <em>{set.prescriptionNotes}</em> : null}</td>
                  <td className="set-prev">
                    {prev && prev.weight != null ? `${prev.weight} × ${prev.reps ?? '-'}` : '—'}
                    {prev && <small className="reference-source">{prev.workoutName} · {shortDate(prev.date)}<br />{SET_TYPE_LABEL[prev.setType]} · série {prev.setIndex}{prev.reused ? ' (referência repetida)' : ''}</small>}
                    {prev && prev.targetRepMin != null && prev.targetRepMax != null && (prev.targetRepMin !== (set.targetRepMin ?? ex.repMin) || prev.targetRepMax !== (set.targetRepMax ?? ex.repMax)) && <small className="reference-source">Meta anterior: {repRange(prev.targetRepMin, prev.targetRepMax)}</small>}
                  </td>
                  <td>
                    <input
                      className="set-input"
                      type="number"
                      inputMode="decimal"
                      value={set.weight ?? ''}
                      placeholder={prev?.weight != null ? String(prev.weight) : '0'}
                      onChange={(e) =>
                        store.updateSet(ex.id, set.id, {
                          weight: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="set-input"
                      type="number"
                      inputMode="numeric"
                      value={set.reps ?? ''}
                      placeholder="0"
                      onChange={(e) =>
                        store.updateSet(ex.id, set.id, {
                          reps: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <button
                      className={`check-btn ${set.completed ? 'done' : ''}`}
                      onClick={() => onCheck(set)}
                      aria-label="Concluir serie"
                    >
                      ✓
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!skipped && (
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn btn--sm" onClick={() => store.addSet(ex.id)}>+ Serie</button>
          {ex.sets.length > 1 && (
            <button className="btn btn--sm btn--ghost" onClick={() => store.removeSet(ex.id, ex.sets[ex.sets.length - 1].id)}>
              − Serie
            </button>
          )}
        </div>
      )}

      {skipped && (
        <button className="btn btn--sm" style={{ marginTop: 8 }} onClick={() => store.unskipExercise(ex.id)}>
          Desfazer pular
        </button>
      )}
    </div>
  );
}

function ExerciseMenu({
  ex,
  onClose,
  onSubstituteToday,
}: {
  ex: SessionExercise;
  onClose: () => void;
  onSubstituteToday: () => void;
}) {
  const store = useSession();
  return (
    <Sheet open onClose={onClose} title={ex.performedExerciseName}>
      <div className="stack-sm">
        <button className="btn btn--block" onClick={onSubstituteToday}>🔁 Substituir somente hoje</button>
        <button
          className="btn btn--block"
          onClick={() => {
            store.moveExercise(ex.id, -1);
          }}
        >
          ↑ Mover para cima (so hoje)
        </button>
        <button
          className="btn btn--block"
          onClick={() => {
            store.moveExercise(ex.id, 1);
          }}
        >
          ↓ Mover para baixo (so hoje)
        </button>
        {ex.status !== 'skipped' ? (
          <button
            className="btn btn--block"
            onClick={() => {
              store.skipExercise(ex.id);
              onClose();
              toast('Exercicio marcado como pulado');
            }}
          >
            ⤼ Pular hoje
          </button>
        ) : (
          <button className="btn btn--block" onClick={() => { store.unskipExercise(ex.id); onClose(); }}>
            Desfazer pular
          </button>
        )}
        <button
          className="btn btn--block btn--danger"
          onClick={() => {
            store.removeExerciseToday(ex.id);
            onClose();
          }}
        >
          Remover da sessao
        </button>
      </div>
    </Sheet>
  );
}

function FinishSheet({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const active = useSession((s) => s.active)!;
  const sessions = useSessions() ?? [];
  const store = useSession();

  const incomplete = active.exercises.filter(
    (e) => e.status !== 'skipped' && !e.sets.some((s) => s.completed),
  );

  const volume = sessionVolume({ ...active, status: 'completed' });
  const sets = sessionCompletedSets(active);
  const prev = sessions
    .filter((s) => s.status === 'completed' && s.workoutId === active.workoutId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const prevVolume = prev ? sessionVolume(prev) : 0;
  const volChange = prev ? percentChange(volume, prevVolume) : null;

  async function doFinish() {
    if (incomplete.length > 0) {
      const proceed = await confirmAction({
        title: `Existem ${incomplete.length} exercicio(s) incompleto(s)`,
        message: 'Deseja finalizar mesmo assim?',
        confirmLabel: 'Finalizar mesmo assim',
        cancelLabel: 'Voltar ao treino',
      });
      if (!proceed) {
        onClose();
        return;
      }
    }
    const result = await store.finalize();
    if (result) {
      if (result.prCount > 0) toast(`🏆 ${result.prCount} novo(s) recorde(s)!`, 'pr');
      nav(`/history/${result.sessionId}`);
    }
  }

  return (
    <Sheet open onClose={onClose} title="Finalizar treino">
      <div className="stat-grid" style={{ marginBottom: 8 }}>
        <div className="stat"><div className="stat-val">{active.exercises.length}</div><div className="stat-lbl">Exercicios</div></div>
        <div className="stat"><div className="stat-val">{sets}</div><div className="stat-lbl">Series</div></div>
        <div className="stat"><div className="stat-val">{formatNumber(volume)}</div><div className="stat-lbl">Volume (kg)</div></div>
      </div>
      {volChange != null && (
        <p className="muted">Volume: <strong style={{ color: volChange >= 0 ? 'var(--green)' : 'var(--red)' }}>{volChange >= 0 ? '+' : ''}{volChange}%</strong> vs ultima sessao</p>
      )}

      <div className="section-title">Como foi o treino?</div>
      <div className="chips">
        {EFFORT_ORDER.map((e) => (
          <button
            key={e}
            className={`chip ${active.perceivedEffort === e ? 'active' : ''}`}
            onClick={() => store.setEffort(e as PerceivedEffort)}
          >
            {EFFORT_LABEL[e]}
          </button>
        ))}
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label>Observacoes do treino</label>
        <textarea
          className="textarea"
          placeholder="Ex: academia cheia, ombro cansado..."
          value={active.note ?? ''}
          onChange={(e) => store.setNote(e.target.value)}
        />
      </div>

      <div className="stack-sm" style={{ marginTop: 16 }}>
        <button className="btn btn--primary btn--lg btn--block" onClick={doFinish}>Concluir treino</button>
        <button className="btn btn--block btn--ghost" onClick={onClose}>Voltar ao treino</button>
      </div>
    </Sheet>
  );
}
