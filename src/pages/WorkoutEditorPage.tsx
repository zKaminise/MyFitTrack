import { useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkout, useExerciseMap } from '@/hooks/useData';
import { BackHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/components';
import { ExercisePicker } from '@/components/ExercisePicker';
import { ExerciseThumb } from '@/components/ExerciseMedia';
import { confirmAction, toast } from '@/ui/feedback';
import type { Workout, WorkoutExercise, Exercise } from '@/domain/types';
import { saveWorkout, duplicateWorkout, deleteWorkout, newWorkoutExercise } from '@/services/workoutService';
import { EQUIPMENT_LABEL, MUSCLE_LABEL, SET_TYPE_LABEL, repRange } from '@/lib/labels';
import { uuid } from '@/lib/id';

const COLORS = ['#ff7a1a', '#3aa0ff', '#37c871', '#f5c542', '#c77dff', '#ff5a7a'];

export default function WorkoutEditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const workout = useWorkout(id);
  const exMap = useExerciseMap();
  const [adding, setAdding] = useState(false);
  const [configFor, setConfigFor] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!workout) return <div className="screen"><BackHeader title="Treino" /><p className="empty">Carregando...</p></div>;

  const update = (fn: (w: Workout) => Workout) => saveWorkout(fn(workout));
  const exercises = [...workout.exercises].sort((a, b) => a.order - b.order);
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets, 0);

  const updateExercise = (weId: string, patch: Partial<WorkoutExercise>) =>
    update((w) => ({ ...w, exercises: w.exercises.map((e) => (e.id === weId ? { ...e, ...patch } : e)) }));

  const move = (weId: string, dir: -1 | 1) => {
    const arr = [...exercises];
    const idx = arr.findIndex((e) => e.id === weId);
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    update((w) => ({ ...w, exercises: arr.map((e, i) => ({ ...e, order: i })) }));
  };

  const removeExercise = (weId: string) =>
    update((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== weId).map((e, i) => ({ ...e, order: i })) }));

  const configExercise = configFor ? exercises.find((e) => e.id === configFor) : null;

  return (
    <div className="screen">
      <BackHeader
        title="Editar treino"
        right={
          <button className="icon-btn" onClick={() => setConfigFor('__workout__')} aria-label="Opcoes do treino">⋮</button>
        }
      />

      <section
        className="workout-editor-hero"
        style={{ '--workout-accent': workout.color ?? '#ff7a1a' } as CSSProperties}
      >
        <div className="workout-editor-hero__top">
          <span className="workout-editor-mark" aria-hidden>W</span>
          <span className="workout-editor-kicker">MODELO DE TREINO</span>
          <span className="workout-autosave">✓ Salvo automaticamente</span>
        </div>
        <input
          className="workout-editor-name"
          aria-label="Nome do treino"
          value={workout.name}
          placeholder="Nome do treino"
          onChange={(event) => update((current) => ({ ...current, name: event.target.value }))}
        />
        <input
          className="workout-editor-description"
          aria-label="Descrição do treino"
          value={workout.description ?? ''}
          placeholder="Ex.: Peito + Tríceps"
          onChange={(event) => update((current) => ({ ...current, description: event.target.value }))}
        />
        <div className="workout-editor-stats">
          <span><strong>{exercises.length}</strong> exercícios</span>
          <span><strong>{totalSets}</strong> séries</span>
          <span><strong>{workout.estimatedMinutes ?? '—'}</strong> min</span>
        </div>
        <button className="workout-details-toggle" onClick={() => setDetailsOpen((value) => !value)} aria-expanded={detailsOpen}>
          <span>Cor, duração e observações</span>
          <b>{detailsOpen ? '−' : '+'}</b>
        </button>
      </section>

      {detailsOpen && (
        <section className="workout-editor-details" aria-label="Detalhes do treino">
          <div className="field">
            <label>Cor do treino</label>
            <div className="workout-color-picker">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className={workout.color === color ? 'is-active' : ''}
                  aria-label={`Usar cor ${color}`}
                  aria-pressed={workout.color === color}
                  onClick={() => update((current) => ({ ...current, color }))}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
          <div className="field">
            <label>Duração estimada</label>
            <div className="workout-duration-input">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min="0"
                value={workout.estimatedMinutes ?? ''}
                placeholder="60"
                onChange={(event) => update((current) => ({
                  ...current,
                  estimatedMinutes: event.target.value === '' ? undefined : Number(event.target.value),
                }))}
              />
              <span>minutos</span>
            </div>
          </div>
          <div className="field workout-details-notes">
            <label>Observações</label>
            <textarea
              className="textarea"
              value={workout.notes ?? ''}
              placeholder="Detalhes gerais deste treino..."
              onChange={(event) => update((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>
        </section>
      )}

      <div className="workout-list-heading">
        <div>
          <span>EXERCÍCIOS</span>
          <h2>Sua sequência</h2>
        </div>
        <span className="pill">{exercises.length}</span>
      </div>
      <div className="stack-sm">
        {exercises.length === 0 && (
          <div className="workout-editor-empty">
            <span aria-hidden>+</span>
            <h3>Monte seu treino</h3>
            <p>Adicione exercícios e organize a ordem em que deseja executá-los.</p>
          </div>
        )}
        {exercises.map((we, i) => {
          const ex = exMap.get(we.exerciseId);
          const prevSuperset = i > 0 && exercises[i - 1].supersetId && exercises[i - 1].supersetId === we.supersetId;
          return (
            <div key={we.id} className={`workout-exercise-card ${prevSuperset ? 'is-superset' : ''}`}>
              <div className="workout-exercise-handle" aria-hidden>≡</div>
              {ex && <ExerciseThumb exercise={ex} size={58} />}
              <button className="workout-exercise-main" onClick={() => setConfigFor(we.id)}>
                  <div className="row" style={{ gap: 6 }}>
                    <strong><span className="workout-exercise-order">{i + 1}</span>{ex?.name ?? 'Exercício'}</strong>
                    {we.supersetId && <span className="pill pill--accent">superset</span>}
                  </div>
                  {ex && <span className="workout-exercise-meta">{MUSCLE_LABEL[ex.primaryMuscle]} · {EQUIPMENT_LABEL[ex.equipment]}</span>}
                  <span className="workout-exercise-plan">
                    <b>{we.sets} × {repRange(we.repMin, we.repMax)}</b><i />{we.restSeconds}s<i />{SET_TYPE_LABEL[we.setType]}
                    {we.targetRir != null ? ` · ${we.targetRir} RIR` : ''}
                    {we.targetRpe != null ? ` · RPE ${we.targetRpe}` : ''}
                  </span>
                  {we.notes && <div className="faint" style={{ fontSize: 12, marginTop: 3 }}>📝 {we.notes}</div>}
              </button>
                <div className="workout-exercise-actions">
                  <button className="icon-btn" onClick={() => move(we.id, -1)} aria-label="Subir">↑</button>
                  <button className="icon-btn" onClick={() => move(we.id, 1)} aria-label="Descer">↓</button>
                  <button className="icon-btn" onClick={() => setConfigFor(we.id)} aria-label="Configurar">⋮</button>
                </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn--primary btn--block workout-add-button" onClick={() => setAdding(true)}>
        <span aria-hidden>+</span> Adicionar exercícios
      </button>

      <ExercisePicker
        open={adding}
        onClose={() => setAdding(false)}
        multi
        title="Adicionar exercícios"
        existingIds={exercises.map((exercise) => exercise.exerciseId)}
        onConfirm={(selected) => {
          update((w) => ({
            ...w,
            exercises: [
              ...w.exercises,
              ...selected.map((exercise, index) => newWorkoutExercise(exercise.id, w.exercises.length + index)),
            ],
          }));
          setAdding(false);
          toast(`✓ ${selected.length} exercício${selected.length === 1 ? '' : 's'} adicionado${selected.length === 1 ? '' : 's'}`);
        }}
      />

      {configExercise && (
        <ExerciseConfigSheet
          we={configExercise}
          exercise={exMap.get(configExercise.exerciseId)}
          index={exercises.findIndex((e) => e.id === configExercise.id)}
          exercises={exercises}
          onClose={() => setConfigFor(null)}
          onSave={(patch) => updateExercise(configExercise.id, patch)}
          onRemove={() => { removeExercise(configExercise.id); setConfigFor(null); }}
          onSubstitutePermanent={(newEx) => {
            updateExercise(configExercise.id, { exerciseId: newEx.id });
            toast('Exercicio substituido no treino (permanente)');
          }}
          onToggleSuperset={() => {
            // Agrupa/desagrupa com o proximo exercicio.
            const idx = exercises.findIndex((e) => e.id === configExercise.id);
            const next = exercises[idx + 1];
            if (!next) { toast('Nao ha proximo exercicio para agrupar'); return; }
            const already = configExercise.supersetId && configExercise.supersetId === next.supersetId;
            const sid = already ? null : (configExercise.supersetId ?? uuid());
            update((w) => ({
              ...w,
              exercises: w.exercises.map((e) =>
                e.id === configExercise.id || e.id === next.id ? { ...e, supersetId: sid } : e,
              ),
            }));
          }}
        />
      )}

      {configFor === '__workout__' && (
        <WorkoutMenu
          workout={workout}
          onClose={() => setConfigFor(null)}
          onDuplicate={async () => { const c = await duplicateWorkout(workout); setConfigFor(null); nav(`/workouts/${c.id}`); }}
          onArchive={async () => { await saveWorkout({ ...workout, archived: !workout.archived }); setConfigFor(null); toast(workout.archived ? 'Desarquivado' : 'Arquivado'); }}
          onDelete={async () => {
            const ok = await confirmAction({ title: `Apagar "${workout.name}"?`, message: 'Isso remove o treino do programa. O historico de sessoes nao e afetado.', danger: true, confirmLabel: 'Apagar treino' });
            if (ok) { await deleteWorkout(workout.id); nav('/workouts'); }
          }}
        />
      )}
    </div>
  );
}

function ExerciseConfigSheet({
  we, exercise, index, exercises, onClose, onSave, onRemove, onSubstitutePermanent, onToggleSuperset,
}: {
  we: WorkoutExercise;
  exercise: Exercise | undefined;
  index: number;
  exercises: WorkoutExercise[];
  onClose: () => void;
  onSave: (patch: Partial<WorkoutExercise>) => void;
  onRemove: () => void;
  onSubstitutePermanent: (ex: Exercise) => void;
  onToggleSuperset: () => void;
}) {
  const [subOpen, setSubOpen] = useState(false);
  const [draft, setDraft] = useState<WorkoutExercise>(we);
  const next = exercises[index + 1];
  const grouped = !!we.supersetId && we.supersetId === next?.supersetId;
  const patchDraft = (patch: Partial<WorkoutExercise>) => setDraft((current) => ({ ...current, ...patch }));
  const save = () => {
    const repMin = Math.max(1, draft.repMin);
    const repMax = Math.max(repMin, draft.repMax);
    onSave({ ...draft, repMin, repMax });
    toast('✓ Alterações salvas');
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Configurar exercício" className="sheet--exercise-config">
      {exercise && (
        <div className="config-exercise-head">
          <ExerciseThumb exercise={exercise} size={68} />
          <div><h3>{exercise.name}</h3><p>{MUSCLE_LABEL[exercise.primaryMuscle]} · {EQUIPMENT_LABEL[exercise.equipment]}</p></div>
        </div>
      )}
      <div className="config-block">
        <label>Séries</label>
        <Stepper value={draft.sets} min={1} max={20} onChange={(sets) => patchDraft({ sets })} />
      </div>
      <div className="config-block">
        <label>Repetições</label>
        <div className="rep-range-editor">
          <NumberField label="Mínimo" value={draft.repMin} min={1} onChange={(repMin) => patchDraft({ repMin })} />
          <span>até</span>
          <NumberField label="Máximo" value={draft.repMax} min={draft.repMin} onChange={(repMax) => patchDraft({ repMax })} />
        </div>
      </div>
      <div className="config-block">
        <label>Descanso</label>
        <div className="rest-presets">
          {[60, 90, 120, 180].map((seconds) => (
            <button key={seconds} className={draft.restSeconds === seconds ? 'active' : ''} onClick={() => patchDraft({ restSeconds: seconds })}>{seconds}s</button>
          ))}
        </div>
        <NumberField label="Personalizado (segundos)" value={draft.restSeconds} min={0} step={15} onChange={(restSeconds) => patchDraft({ restSeconds })} />
      </div>
      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <div className="field grow">
          <label>Tipo</label>
          <select className="select" value={draft.setType} onChange={(e) => patchDraft({ setType: e.target.value as WorkoutExercise['setType'] })}>
            {Object.entries(SET_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="row" style={{ gap: 10, marginTop: 10 }}>
        <div className="field grow">
          <label>RIR alvo (opcional)</label>
          <input className="input" type="number" inputMode="numeric" value={draft.targetRir ?? ''} placeholder="—"
            onChange={(e) => patchDraft({ targetRir: e.target.value === '' ? null : Number(e.target.value) })} />
        </div>
        <div className="field grow">
          <label>RPE alvo (opcional)</label>
          <input className="input" type="number" inputMode="decimal" value={draft.targetRpe ?? ''} placeholder="—"
            onChange={(e) => patchDraft({ targetRpe: e.target.value === '' ? null : Number(e.target.value) })} />
        </div>
      </div>
      <div className="field" style={{ marginTop: 10 }}>
        <label>Observacao do exercicio</label>
        <input className="input" value={draft.notes ?? ''} placeholder="Ex: banco posição 3, pegada neutra..."
          onChange={(e) => patchDraft({ notes: e.target.value })} />
      </div>

      <div className="stack-sm" style={{ marginTop: 16 }}>
        <button className="btn btn--primary btn--block" onClick={save}>SALVAR ALTERAÇÕES</button>
        {next && (
          <button className="btn btn--block" onClick={onToggleSuperset}>
            {grouped ? 'Desfazer superset' : '⛓ Agrupar com o proximo (superset)'}
          </button>
        )}
        <button className="btn btn--block" onClick={() => setSubOpen(true)}>🔧 Substituir no treino (permanente)</button>
        <button className="btn btn--block btn--danger" onClick={onRemove}>Remover exercicio</button>
      </div>

      <ExercisePicker
        open={subOpen}
        onClose={() => setSubOpen(false)}
        title="Substituir permanentemente"
        onPick={(ex) => { onSubstitutePermanent(ex); setSubOpen(false); }}
      />
    </Sheet>
  );
}

function NumberField({ label, value, onChange, min, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <div className="field grow">
      <label>{label}</label>
      <input
        className="input" type="number" inputMode="numeric" value={value}
        onChange={(e) => { const v = Number(e.target.value); onChange(min != null ? Math.max(min, v) : v); }}
        step={step}
      />
    </div>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Diminuir">−</button>
      <strong>{value}</strong>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Aumentar">+</button>
    </div>
  );
}

function WorkoutMenu({ workout, onClose, onDuplicate, onArchive, onDelete }: {
  workout: Workout; onClose: () => void; onDuplicate: () => void; onArchive: () => void; onDelete: () => void;
}) {
  return (
    <Sheet open onClose={onClose} title={workout.name}>
      <div className="stack-sm">
        <button className="btn btn--block" onClick={onDuplicate}>Duplicar treino</button>
        <button className="btn btn--block" onClick={onArchive}>{workout.archived ? 'Desarquivar' : 'Arquivar'}</button>
        <button className="btn btn--block btn--danger" onClick={onDelete}>Apagar treino</button>
      </div>
    </Sheet>
  );
}
