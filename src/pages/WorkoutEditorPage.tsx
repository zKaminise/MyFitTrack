import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkout, useExerciseMap } from '@/hooks/useData';
import { BackHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/components';
import { ExercisePicker } from '@/components/ExercisePicker';
import { confirmAction, toast } from '@/ui/feedback';
import type { Workout, WorkoutExercise, Exercise } from '@/domain/types';
import { saveWorkout, duplicateWorkout, deleteWorkout, newWorkoutExercise } from '@/services/workoutService';
import { SET_TYPE_LABEL, repRange } from '@/lib/labels';
import { uuid } from '@/lib/id';

const COLORS = ['#ff7a1a', '#3aa0ff', '#37c871', '#f5c542', '#c77dff', '#ff5a7a'];

export default function WorkoutEditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const workout = useWorkout(id);
  const exMap = useExerciseMap();
  const [adding, setAdding] = useState(false);
  const [configFor, setConfigFor] = useState<string | null>(null);

  if (!workout) return <div className="screen"><BackHeader title="Treino" /><p className="empty">Carregando...</p></div>;

  const update = (fn: (w: Workout) => Workout) => saveWorkout(fn(workout));
  const exercises = [...workout.exercises].sort((a, b) => a.order - b.order);

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

      <div className="card stack" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Nome</label>
          <input className="input" value={workout.name} onChange={(e) => update((w) => ({ ...w, name: e.target.value }))} />
        </div>
        <div className="field">
          <label>Descricao (ex: Peito + Triceps)</label>
          <input className="input" value={workout.description ?? ''} onChange={(e) => update((w) => ({ ...w, description: e.target.value }))} />
        </div>
        <div className="field">
          <label>Cor</label>
          <div className="row" style={{ gap: 8 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                aria-label={`cor ${c}`}
                onClick={() => update((w) => ({ ...w, color: c }))}
                style={{
                  width: 32, height: 32, borderRadius: 10, background: c,
                  border: workout.color === c ? '3px solid var(--text)' : '2px solid var(--border)',
                }}
              />
            ))}
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="field grow">
            <label>Duracao estimada (min)</label>
            <input
              className="input" type="number" inputMode="numeric"
              value={workout.estimatedMinutes ?? ''}
              onChange={(e) => update((w) => ({ ...w, estimatedMinutes: e.target.value === '' ? undefined : Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="field">
          <label>Observacoes</label>
          <textarea className="textarea" value={workout.notes ?? ''} onChange={(e) => update((w) => ({ ...w, notes: e.target.value }))} />
        </div>
      </div>

      <div className="section-title">Exercicios ({exercises.length})</div>
      <div className="stack-sm">
        {exercises.map((we, i) => {
          const ex = exMap.get(we.exerciseId);
          const prevSuperset = i > 0 && exercises[i - 1].supersetId && exercises[i - 1].supersetId === we.supersetId;
          return (
            <div key={we.id} className="card" style={prevSuperset ? { borderColor: 'var(--accent)' } : undefined}>
              <div className="row-between">
                <div className="grow">
                  <div className="row" style={{ gap: 6 }}>
                    <strong>{i + 1}. {ex?.name ?? 'Exercicio'}</strong>
                    {we.supersetId && <span className="pill pill--accent">superset</span>}
                  </div>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {we.sets} × {repRange(we.repMin, we.repMax)} · {we.restSeconds}s · {SET_TYPE_LABEL[we.setType]}
                    {we.targetRir != null ? ` · ${we.targetRir} RIR` : ''}
                    {we.targetRpe != null ? ` · RPE ${we.targetRpe}` : ''}
                  </span>
                  {we.notes && <div className="faint" style={{ fontSize: 12, marginTop: 3 }}>📝 {we.notes}</div>}
                </div>
                <div className="row" style={{ gap: 2 }}>
                  <button className="icon-btn" onClick={() => move(we.id, -1)} aria-label="Subir">↑</button>
                  <button className="icon-btn" onClick={() => move(we.id, 1)} aria-label="Descer">↓</button>
                  <button className="icon-btn" onClick={() => setConfigFor(we.id)} aria-label="Configurar">⚙</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn--primary btn--block" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>
        + Adicionar exercicio
      </button>

      <ExercisePicker
        open={adding}
        onClose={() => setAdding(false)}
        multi
        title="Adicionar exercicios"
        onPick={(exercise) => {
          update((w) => ({ ...w, exercises: [...w.exercises, newWorkoutExercise(exercise.id, w.exercises.length)] }));
          toast(`${exercise.name} adicionado`);
        }}
      />

      {configExercise && (
        <ExerciseConfigSheet
          we={configExercise}
          exercise={exMap.get(configExercise.exerciseId)}
          index={exercises.findIndex((e) => e.id === configExercise.id)}
          exercises={exercises}
          onClose={() => setConfigFor(null)}
          onChange={(patch) => updateExercise(configExercise.id, patch)}
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
  we, exercise, index, exercises, onClose, onChange, onRemove, onSubstitutePermanent, onToggleSuperset,
}: {
  we: WorkoutExercise;
  exercise: Exercise | undefined;
  index: number;
  exercises: WorkoutExercise[];
  onClose: () => void;
  onChange: (patch: Partial<WorkoutExercise>) => void;
  onRemove: () => void;
  onSubstitutePermanent: (ex: Exercise) => void;
  onToggleSuperset: () => void;
}) {
  const [subOpen, setSubOpen] = useState(false);
  const next = exercises[index + 1];
  const grouped = !!we.supersetId && we.supersetId === next?.supersetId;
  return (
    <Sheet open onClose={onClose} title={exercise?.name ?? 'Configurar'}>
      <div className="row" style={{ gap: 10 }}>
        <NumberField label="Series" value={we.sets} min={1} onChange={(v) => onChange({ sets: v })} />
        <NumberField label="Rep min" value={we.repMin} min={1} onChange={(v) => onChange({ repMin: v })} />
        <NumberField label="Rep max" value={we.repMax} min={we.repMin} onChange={(v) => onChange({ repMax: v })} />
      </div>
      <div className="row" style={{ gap: 10, marginTop: 10 }}>
        <NumberField label="Descanso (s)" value={we.restSeconds} min={0} step={15} onChange={(v) => onChange({ restSeconds: v })} />
        <div className="field grow">
          <label>Tipo</label>
          <select className="select" value={we.setType} onChange={(e) => onChange({ setType: e.target.value as WorkoutExercise['setType'] })}>
            {Object.entries(SET_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="row" style={{ gap: 10, marginTop: 10 }}>
        <div className="field grow">
          <label>RIR alvo (opcional)</label>
          <input className="input" type="number" inputMode="numeric" value={we.targetRir ?? ''} placeholder="—"
            onChange={(e) => onChange({ targetRir: e.target.value === '' ? null : Number(e.target.value) })} />
        </div>
        <div className="field grow">
          <label>RPE alvo (opcional)</label>
          <input className="input" type="number" inputMode="decimal" value={we.targetRpe ?? ''} placeholder="—"
            onChange={(e) => onChange({ targetRpe: e.target.value === '' ? null : Number(e.target.value) })} />
        </div>
      </div>
      <div className="field" style={{ marginTop: 10 }}>
        <label>Observacao do exercicio</label>
        <input className="input" value={we.notes ?? ''} placeholder="Ex: banco posicao 3, pegada neutra..."
          onChange={(e) => onChange({ notes: e.target.value })} />
      </div>

      <div className="stack-sm" style={{ marginTop: 16 }}>
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
