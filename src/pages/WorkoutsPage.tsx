import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkouts, useExerciseMap } from '@/hooks/useData';
import { createWorkout, saveWorkout } from '@/services/workoutService';

export default function WorkoutsPage() {
  const nav = useNavigate();
  const workouts = useWorkouts() ?? [];
  const exMap = useExerciseMap();
  const [showArchived, setShowArchived] = useState(false);

  const activeWorkouts = workouts.filter((w) => !w.archived).sort((a, b) => a.name.localeCompare(b.name));
  const archived = workouts.filter((w) => w.archived);

  async function newWorkout() {
    const w = createWorkout({ name: `Treino ${String.fromCharCode(65 + activeWorkouts.length)}` });
    await saveWorkout(w);
    nav(`/workouts/${w.id}`);
  }

  return (
    <div className="screen">
      <div className="row-between">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Treinos</h1>
        <button className="btn btn--primary btn--sm" onClick={newWorkout}>+ Novo</button>
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        {activeWorkouts.length === 0 && (
          <div className="empty card">
            <span className="emoji">📋</span>
            Nenhum treino ainda. Crie o Treino A para comecar.
          </div>
        )}
        {activeWorkouts.map((w) => {
          const totalSets = w.exercises.reduce((s, e) => s + e.sets, 0);
          return (
            <button key={w.id} className="card card-tap" onClick={() => nav(`/workouts/${w.id}`)} style={{ textAlign: 'left' }}>
              <div className="row" style={{ gap: 10 }}>
                <span className="tag-dot" style={{ background: w.color ?? 'var(--accent)', width: 14, height: 14 }} />
                <div className="grow">
                  <h3 style={{ fontSize: 18 }}>{w.name}</h3>
                  <span className="muted" style={{ fontSize: 14 }}>{w.description}</span>
                </div>
                <span className="faint">›</span>
              </div>
              <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
                <span className="pill">{w.exercises.length} exercicios</span>
                <span className="pill">{totalSets} series</span>
              </div>
              {w.exercises.length > 0 && (
                <p className="faint" style={{ fontSize: 13, marginTop: 8 }}>
                  {[...w.exercises].sort((a, b) => a.order - b.order).slice(0, 3).map((e) => exMap.get(e.exerciseId)?.name).filter(Boolean).join(' · ')}
                  {w.exercises.length > 3 ? ' ...' : ''}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="section-title">Programa</div>
      <button className="list-item card-tap" onClick={() => nav('/program')}>
        <span style={{ fontSize: 20 }}>🗓️</span>
        <div className="grow">
          <div className="li-title">Configurar programacao</div>
          <div className="li-sub">Dias fixos, ciclo continuo e periodizacao</div>
        </div>
        <span className="faint">›</span>
      </button>

      {archived.length > 0 && (
        <>
          <div className="section-title">
            <button className="btn btn--sm btn--ghost" style={{ padding: 0, minHeight: 0 }} onClick={() => setShowArchived((v) => !v)}>
              Arquivados ({archived.length}) {showArchived ? '▾' : '▸'}
            </button>
          </div>
          {showArchived &&
            archived.map((w) => (
              <button key={w.id} className="list-item card-tap" style={{ opacity: 0.7 }} onClick={() => nav(`/workouts/${w.id}`)}>
                <div className="grow"><div className="li-title">{w.name}</div><div className="li-sub">{w.description}</div></div>
                <span className="faint">›</span>
              </button>
            ))}
        </>
      )}
    </div>
  );
}
