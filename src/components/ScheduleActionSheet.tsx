import { useState } from 'react';
import { Sheet } from '@/ui/components';
import type { Workout } from '@/domain/types';
import { addDays, longDate, todayISO } from '@/domain/dates';

export function WorkoutChoiceSheet({ open, title, workouts, onClose, onChoose }: {
  open: boolean; title: string; workouts: Workout[]; onClose: () => void; onChoose: (workout: Workout) => void;
}) {
  return <Sheet open={open} onClose={onClose} title={title} subtitle="Escolha qualquer treino — sua programação não limita a execução.">
    <div className="stack-sm schedule-options">
      {workouts.filter(w => !w.archived).map(w => <button className="list-item card-tap" key={w.id} onClick={() => onChoose(w)}>
        <span className="tag-dot" style={{ background: w.color ?? 'var(--accent)' }} /><span className="grow"><strong>{w.name}</strong><small>{w.description || `${w.exercises.length} exercícios`}</small></span><span>›</span>
      </button>)}
    </div>
  </Sheet>;
}

export function ScheduleEditSheet({ open, date, baseLabel, currentLabel, adjusted, workouts, onClose, onStart, onReplace, onSwap, onRestore }: {
  open: boolean; date: string; baseLabel: string; currentLabel: string; adjusted: boolean; workouts: Workout[]; onClose: () => void;
  onStart: () => void; onReplace: (id: string | null) => void; onSwap: (date: string) => void; onRestore: () => void;
}) {
  const [mode, setMode] = useState<'main'|'replace'|'swap'>('main');
  const nearby = Array.from({length: 15}, (_, i) => addDays(date, i - 7)).filter(d => d !== date);
  return <Sheet open={open} onClose={() => { setMode('main'); onClose(); }} title={longDate(date)} subtitle={`Programado: ${baseLabel}${adjusted ? ` · Ajustado: ${currentLabel}` : ''}`}>
    {mode === 'main' && <div className="stack-sm">
      <button className="btn btn--primary btn--block" onClick={onStart}>Fazer um treino</button>
      <button className="btn btn--ghost btn--block" onClick={() => setMode('replace')}>Alterar este dia</button>
      <button className="btn btn--ghost btn--block" onClick={() => setMode('swap')}>Trocar com outro dia</button>
      {adjusted && <button className="btn btn--ghost btn--block" onClick={onRestore}>Restaurar programação original</button>}
    </div>}
    {mode === 'replace' && <div className="stack-sm schedule-options">
      <button className="list-item" onClick={() => onReplace(null)}><span>😌</span><strong>Descanso</strong></button>
      {workouts.filter(w => !w.archived).map(w => <button className="list-item" key={w.id} onClick={() => onReplace(w.id)}><span className="tag-dot" style={{background:w.color}}/><strong>{w.name}</strong></button>)}
    </div>}
    {mode === 'swap' && <div className="stack-sm schedule-options">
      <p className="muted">Escolha a data que trocará de posição com {longDate(date)}.</p>
      {nearby.map(d => <button className="list-item" key={d} onClick={() => onSwap(d)}><span className="grow"><strong>{longDate(d)}</strong><small>{d === todayISO() ? 'Hoje' : ''}</small></span><span>↔</span></button>)}
    </div>}
  </Sheet>;
}
