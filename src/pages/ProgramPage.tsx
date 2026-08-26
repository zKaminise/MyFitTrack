import { useEffect, useState } from 'react';
import { BackHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/components';
import { useActiveProgram, useWorkouts, usePeriodizations, useCompletedSessions } from '@/hooks/useData';
import { programRepo } from '@/repositories/dexie';
import { setActiveProgram } from '@/services/workoutService';
import { applyMissedShift } from '@/domain/programAdvance';
import { currentPeriodizationWeek } from '@/domain/periodization';
import { toast } from '@/ui/feedback';
import type { Program, CycleItem } from '@/domain/types';
import { uuid, nowISO } from '@/lib/id';
import { todayISO, daysBetween, weekdayLabel } from '@/domain/dates';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export default function ProgramPage() {
  const program = useActiveProgram();
  const workouts = (useWorkouts() ?? []).filter((w) => !w.archived);
  const periodizations = usePeriodizations() ?? [];
  const sessions = useCompletedSessions() ?? [];
  const [pickCycleItem, setPickCycleItem] = useState<string | 'new' | null>(null);

  // Aplica a politica de treino perdido ao abrir (ciclo shift).
  useEffect(() => {
    if (!program) return;
    const done = new Set(sessions.map((s) => s.date));
    const advanced = applyMissedShift(program, done);
    if (advanced.cycleOffset !== program.cycleOffset || advanced.lastAdvancedDate !== program.lastAdvancedDate) {
      void programRepo.put(advanced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  async function createProgram() {
    const p: Program = {
      id: uuid(), createdAt: nowISO(), updatedAt: nowISO(), name: 'Meu Programa',
      scheduleType: 'cycle', cycleAnchorDate: todayISO(),
      fixedDays: WEEKDAYS.map((weekday) => ({ weekday, workoutId: null })),
      cycleItems: [{ id: uuid(), order: 0, workoutId: workouts[0]?.id ?? null }],
      missedPolicy: 'keep-calendar', cycleOffset: 0, lastAdvancedDate: todayISO(),
      paused: false, periodizationId: null, periodizationStartDate: null, active: true,
    };
    await setActiveProgram(p);
    toast('Programa criado');
  }

  if (!program) {
    return (
      <div className="screen">
        <BackHeader title="Programa" />
        <div className="empty card"><span className="emoji">🗓️</span>Nenhum programa ativo.</div>
        <button className="btn btn--primary btn--block" style={{ marginTop: 12 }} onClick={createProgram} disabled={workouts.length === 0}>
          Criar programa
        </button>
        {workouts.length === 0 && <p className="faint center" style={{ marginTop: 8 }}>Crie ao menos um treino primeiro.</p>}
      </div>
    );
  }

  const save = (fn: (p: Program) => Program) => programRepo.put({ ...fn(program), updatedAt: nowISO() });
  const workoutName = (idv: string | null) => (idv ? workouts.find((w) => w.id === idv)?.name ?? 'Treino removido' : 'Descanso');
  const cycleItems = [...program.cycleItems].sort((a, b) => a.order - b.order);
  const periodInfo = program.periodizationId
    ? currentPeriodizationWeek(program, periodizations.find((p) => p.id === program.periodizationId)!)
    : null;

  // ----- Cycle editing helpers -----
  const setCycle = (items: CycleItem[]) => save((p) => ({ ...p, cycleItems: items.map((c, i) => ({ ...c, order: i })) }));
  const moveItem = (id: string, dir: -1 | 1) => {
    const arr = [...cycleItems];
    const idx = arr.findIndex((c) => c.id === id);
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    setCycle(arr);
  };

  async function togglePause() {
    if (program!.paused) {
      // Retomar: desloca o anchor pelo tempo pausado para nao pular treinos.
      const pausedDays = program!.pausedAt ? Math.max(0, daysBetween(program!.pausedAt.slice(0, 10), todayISO())) : 0;
      await save((p) => ({ ...p, paused: false, pausedAt: null, cycleOffset: p.cycleOffset + pausedDays, lastAdvancedDate: todayISO() }));
      toast('Programa retomado');
    } else {
      await save((p) => ({ ...p, paused: true, pausedAt: nowISO() }));
      toast('Programa pausado');
    }
  }

  return (
    <div className="screen">
      <BackHeader title="Programa" />

      <div className="hero" style={{ marginBottom: 14 }}>
        <span className="pill pill--accent">Programa atual</span>
        <h2 style={{ fontSize: 22, margin: '8px 0 2px' }}>{program.name}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Tipo: {program.scheduleType === 'cycle' ? 'Ciclo continuo' : 'Dias fixos'}
          {program.paused && ' · ⏸ pausado'}
        </p>
        {program.scheduleType === 'cycle' && (
          <p className="faint" style={{ fontSize: 13 }}>Sequencia: {cycleItems.map((c) => workoutName(c.workoutId)).join(' → ')}</p>
        )}
        {periodInfo && <span className="pill">Periodizacao: Semana {periodInfo.weekNumber}/{periodInfo.totalWeeks} — {periodInfo.week.name}</span>}
      </div>

      <button className="btn btn--block" onClick={togglePause}>{program.paused ? '▶ Retomar programa' : '⏸ Pausar programa'}</button>

      <div className="section-title">Tipo de programacao</div>
      <div className="row" style={{ gap: 8 }}>
        <button className={`btn grow ${program.scheduleType === 'fixed' ? 'btn--primary' : ''}`} onClick={() => save((p) => ({ ...p, scheduleType: 'fixed' }))}>Dias fixos</button>
        <button className={`btn grow ${program.scheduleType === 'cycle' ? 'btn--primary' : ''}`} onClick={() => save((p) => ({ ...p, scheduleType: 'cycle' }))}>Ciclo continuo</button>
      </div>

      {program.scheduleType === 'fixed' ? (
        <>
          <div className="section-title">Semana fixa</div>
          <div className="stack-sm">
            {WEEKDAYS.map((wd) => {
              const day = program.fixedDays.find((d) => d.weekday === wd);
              return (
                <div key={wd} className="list-item">
                  <span style={{ width: 44, fontWeight: 700 }}>{weekdayLabel(wd)}</span>
                  <select
                    className="select grow"
                    value={day?.workoutId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      save((p) => ({ ...p, fixedDays: WEEKDAYS.map((w) => ({ weekday: w, workoutId: w === wd ? val : (p.fixedDays.find((d) => d.weekday === w)?.workoutId ?? null) })) }));
                    }}
                  >
                    <option value="">Descanso</option>
                    {workouts.map((w) => <option key={w.id} value={w.id}>{w.name} — {w.description}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="section-title">Editor de ciclo</div>
          <div className="stack-sm">
            {cycleItems.map((item, i) => (
              <div key={item.id} className="list-item">
                <span className="set-idx">{i + 1}</span>
                <div className="grow"><div className="li-title">{workoutName(item.workoutId)}</div></div>
                <button className="icon-btn" onClick={() => moveItem(item.id, -1)}>↑</button>
                <button className="icon-btn" onClick={() => moveItem(item.id, 1)}>↓</button>
                <button className="icon-btn" onClick={() => setCycle([...cycleItems.slice(0, i + 1), { id: uuid(), order: 0, workoutId: item.workoutId }, ...cycleItems.slice(i + 1)])} aria-label="Duplicar">⎘</button>
                <button className="icon-btn btn--danger" onClick={() => setCycle(cycleItems.filter((c) => c.id !== item.id))}>✕</button>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn grow" onClick={() => setPickCycleItem('new')}>+ Treino</button>
            <button className="btn grow" onClick={() => setCycle([...cycleItems, { id: uuid(), order: 0, workoutId: null }])}>+ Descanso</button>
          </div>

          <div className="section-title">Se eu nao treinar no dia</div>
          <div className="row" style={{ gap: 8 }}>
            <button className={`btn grow ${program.missedPolicy === 'keep-calendar' ? 'btn--primary' : ''}`} onClick={() => save((p) => ({ ...p, missedPolicy: 'keep-calendar' }))}>Manter calendario</button>
            <button className={`btn grow ${program.missedPolicy === 'shift-cycle' ? 'btn--primary' : ''}`} onClick={() => save((p) => ({ ...p, missedPolicy: 'shift-cycle' }))}>Deslocar ciclo</button>
          </div>
          <p className="faint" style={{ fontSize: 13 }}>
            {program.missedPolicy === 'keep-calendar' ? 'O treino perdido continua no calendario; o ciclo avanca normalmente.' : 'O treino nao realizado passa para o dia seguinte.'}
          </p>
        </>
      )}

      <div className="section-title">Periodizacao</div>
      <select
        className="select"
        value={program.periodizationId ?? ''}
        onChange={(e) => {
          const val = e.target.value || null;
          save((p) => ({ ...p, periodizationId: val, periodizationStartDate: val ? todayISO() : null }));
        }}
      >
        <option value="">Sem periodizacao</option>
        {periodizations.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.weeks.length} semanas)</option>)}
      </select>

      {pickCycleItem && (
        <Sheet open onClose={() => setPickCycleItem(null)} title="Adicionar ao ciclo">
          <div className="stack-sm">
            {workouts.map((w) => (
              <button key={w.id} className="list-item card-tap" onClick={() => { setCycle([...cycleItems, { id: uuid(), order: 0, workoutId: w.id }]); setPickCycleItem(null); }}>
                <div className="grow"><div className="li-title">{w.name}</div><div className="li-sub">{w.description}</div></div>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
