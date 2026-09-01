import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WeekCalendar } from '@/components/WeekCalendar';
import { CycleAdjustmentSheet } from '@/components/CycleAdjustmentSheet';
import { ScheduleEditSheet, WorkoutChoiceSheet } from '@/components/ScheduleActionSheet';
import {
  useActiveProgram,
  useWorkouts,
  useSessions,
  useExerciseMap,
  usePeriodization,
  useScheduleOverrides,
} from '@/hooks/useData';
import { resolveDay, nextTrainingDay, repositionCycle } from '@/domain/scheduling';
import { resolveSchedule } from '@/domain/scheduleOverrides';
import { currentPeriodizationWeek } from '@/domain/periodization';
import { todayISO, relativeDays, shortDate, longDate, weekdayLabel, weekday } from '@/domain/dates';
import type { Exercise, Workout } from '@/domain/types';
import { useSession } from '@/store/sessionStore';
import { buildSession } from '@/services/sessionService';
import { confirmAction, toast } from '@/ui/feedback';
import { repRange, formatMinutes } from '@/lib/labels';
import { useAuth } from '@/store/authStore';
import { programRepo } from '@/repositories/dexie';
import { nowISO, uuid } from '@/lib/id';
import { replaceScheduleDay, restoreScheduleDay, swapScheduleDays } from '@/services/scheduleOverrideService';
import { hasMixedPrescription } from '@/domain/setPrescription';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function TodayPage() {
  const nav = useNavigate();
  const firstName = useAuth((s) => s.user?.name?.split(' ')[0]);
  const program = useActiveProgram();
  const workouts = useWorkouts() ?? [];
  const sessions = useSessions() ?? [];
  const exMap = useExerciseMap();
  const periodization = usePeriodization(program?.periodizationId);
  const overrides = useScheduleOverrides() ?? [];
  const active = useSession((s) => s.active);
  const start = useSession((s) => s.start);

  const today = todayISO();
  const [selected, setSelected] = useState(today);
  const [adjustingCycle, setAdjustingCycle] = useState(false);
  const [choosingWorkout, setChoosingWorkout] = useState(false);
  const [editingDay, setEditingDay] = useState(false);

  const workoutById = new Map(workouts.map((w) => [w.id, w]));
  const resolution = program ? resolveSchedule(program, selected, overrides) : null;
  const baseResolution = program ? resolveDay(program, selected) : null;
  const selectedWorkout = resolution?.effectiveWorkoutId ? workoutById.get(resolution.effectiveWorkoutId) : null;

  const periodWeek =
    program && periodization
      ? currentPeriodizationWeek(program, periodization, selected)?.week ?? null
      : null;

  const lastDoneFor = (workoutId: string) =>
    sessions.find((s) => s.status === 'completed' && s.workoutId === workoutId)?.date ?? null;

  async function handleStart(workout: Workout, forceExtra = false) {
    if (active) {
      const cont = await confirmAction({
        title: 'Ja existe um treino em andamento',
        message: `Voce tem "${active.workoutName}" em andamento. O que deseja fazer?`,
        confirmLabel: 'Continuar aquele',
        cancelLabel: 'Descartar e iniciar outro',
      });
      if (cont) {
        nav('/session');
        return;
      }
      await useSession.getState().discard();
    }
    const session = buildSession({
      workout,
      exercisesById: exMap,
      program: program ?? null,
      periodWeek,
      allSessions: sessions,
      scheduledWorkoutId: resolution?.effectiveWorkoutId ?? null,
      scheduledWorkoutName: labelFor(resolution?.effectiveWorkoutId),
      date: selected,
      scheduleSource: forceExtra || workout.id !== resolution?.effectiveWorkoutId ? 'extra' : (resolution?.override ? (resolution.override.type === 'swap' ? 'swap' : 'override') : 'scheduled'),
      scheduleOverrideId: resolution?.override?.id ?? null,
    });
    await start(session);
    nav('/session');
  }

  async function handleCycleAdjustment(cycleIndex: number) {
    if (!program || program.scheduleType !== 'cycle') return;
    const items = [...program.cycleItems].sort((a, b) => a.order - b.order);
    const chosen = items[cycleIndex];
    if (!chosen) return;
    const nameFor = (workoutId: string | null) =>
      workoutId ? workoutById.get(workoutId)?.name ?? 'Treino removido' : 'Descanso';
    const newSequence = items
      .map((_, step) => nameFor(items[(cycleIndex + step) % items.length].workoutId))
      .join(' → ');
    const confirmed = await confirmAction({
      title: `Começar hoje com ${nameFor(chosen.workoutId)}?`,
      message: `A partir de hoje: ${newSequence}. Os dias anteriores e seu histórico continuarão iguais.`,
      confirmLabel: 'Ajustar ciclo',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    const adjusted = repositionCycle(program, today, cycleIndex, uuid(), nowISO());
    await programRepo.put({ ...adjusted, updatedAt: nowISO() });
    setSelected(today);
    setAdjustingCycle(false);
    toast(`✓ Hoje agora é ${nameFor(chosen.workoutId)}`);
  }

  const isToday = selected === today;
  const sessionOnSelected = sessions.find((s) => s.date === selected && s.status === 'completed');
  const sessionsOnSelected = sessions.filter((s) => s.date === selected && s.status === 'completed');
  const labelFor = (id: string | null | undefined) => id ? workoutById.get(id)?.name ?? 'Treino removido' : 'Descanso';

  async function replaceDay(workoutId: string | null) {
    if (!program) return;
    await replaceScheduleDay(program, selected, workoutId); setEditingDay(false); toast('✓ Dia ajustado');
  }
  async function swapDay(otherDate: string) {
    if (!program) return;
    await swapScheduleDays(program, selected, otherDate); setEditingDay(false); toast('✓ Os dias foram trocados');
  }
  async function restoreDay() {
    if (!resolution?.override) return;
    await restoreScheduleDay(resolution.override); setEditingDay(false); toast('Programação original restaurada');
  }

  return (
    <div className="screen">
      <div className="row-between">
        <div>
          {firstName && <div className="faint" style={{ fontSize: 14, fontWeight: 600 }}>{greeting()}, {firstName}</div>}
          <h1 className="page-title" style={{ marginBottom: 0 }}>Hoje</h1>
        </div>
        <span className="faint" style={{ fontSize: 13 }}>{longDate(today)}</span>
      </div>

      <div style={{ margin: '14px 0 18px' }}>
        <WeekCalendar program={program ?? null} sessions={sessions} overrides={overrides} selected={selected} onSelect={(date) => { setSelected(date); if (date !== today) setEditingDay(true); }} />
      </div>

      {active && isToday && (
        <div className="hero" style={{ marginBottom: 14, borderColor: 'var(--accent)' }}>
          <span className="pill pill--accent">Em andamento</span>
          <h2 style={{ fontSize: 24, margin: '10px 0 2px' }}>{active.workoutName}</h2>
          <p className="muted" style={{ marginTop: 0 }}>{active.workoutDescription}</p>
          <button className="btn btn--primary btn--lg btn--block" onClick={() => nav('/session')}>
            CONTINUAR TREINO
          </button>
        </div>
      )}

      {!program && (
        <div className="empty card">
          <span className="emoji">📋</span>
          Nenhum programa ativo.
          <div style={{ marginTop: 14 }}>
            <button className="btn btn--primary" onClick={() => nav('/program')}>Configurar programa</button>
          </div>
        </div>
      )}

      {program?.paused && isToday && (
        <div className="hero center">
          <div style={{ fontSize: 40 }}>⏸</div>
          <h2 style={{ fontSize: 24, margin: '6px 0' }}>Programa pausado</h2>
          <p className="muted">O ciclo nao avanca enquanto estiver pausado.</p>
          <button className="btn btn--primary" onClick={() => nav('/program')}>Retomar programa</button>
        </div>
      )}

      {program && !program.paused && !active && selectedWorkout && (
        <TodayWorkoutCard
          workout={selectedWorkout}
          exMap={exMap}
          lastDate={lastDoneFor(selectedWorkout.id)}
          periodWeekName={periodWeek?.name ?? null}
          isToday={isToday}
          onStart={() => handleStart(selectedWorkout)}
          onOther={() => setChoosingWorkout(true)}
          onEditDay={() => setEditingDay(true)}
          onAdjustCycle={program.scheduleType === 'cycle' && isToday ? () => setAdjustingCycle(true) : undefined}
        />
      )}

      {program && !program.paused && !active && resolution?.isRest && (
        <RestCard
          program={program}
          workoutById={workoutById}
          selected={selected}
          isToday={isToday}
          onAdjustCycle={program.scheduleType === 'cycle' && isToday ? () => setAdjustingCycle(true) : undefined}
          onTrain={() => setChoosingWorkout(true)}
          onEditDay={() => setEditingDay(true)}
        />
      )}

      {!isToday && sessionOnSelected && (
        <button
          className="list-item card-tap"
          style={{ marginTop: 12 }}
          onClick={() => nav(`/history/${sessionOnSelected.id}`)}
        >
          <span className="tag-dot" style={{ background: 'var(--green)' }} />
          <div className="grow">
            <div className="li-title">{sessionOnSelected.workoutName} — realizado</div>
            <div className="li-sub">{shortDate(sessionOnSelected.date)} · toque para ver a sessao</div>
          </div>
          <span className="faint">›</span>
        </button>
      )}
      {sessionsOnSelected.length > 1 && <p className="faint" style={{textAlign:'center'}}>{sessionsOnSelected.length} sessões realizadas neste dia</p>}

      <WorkoutChoiceSheet open={choosingWorkout} title="Qual treino você quer fazer?" workouts={workouts} onClose={() => setChoosingWorkout(false)} onChoose={(w) => { setChoosingWorkout(false); void handleStart(w, w.id !== resolution?.effectiveWorkoutId); }} />
      {program && <ScheduleEditSheet open={editingDay} date={selected} baseLabel={labelFor(baseResolution?.workoutId)} currentLabel={labelFor(resolution?.effectiveWorkoutId)} adjusted={Boolean(resolution?.override)} workouts={workouts} onClose={() => setEditingDay(false)} onStart={() => {setEditingDay(false); setChoosingWorkout(true);}} onReplace={(id) => void replaceDay(id)} onSwap={(d) => void swapDay(d)} onRestore={() => void restoreDay()} />}

      {program?.scheduleType === 'cycle' && (
        <CycleAdjustmentSheet
          open={adjustingCycle}
          program={program}
          workouts={workouts}
          date={today}
          onClose={() => setAdjustingCycle(false)}
          onChoose={(cycleIndex) => void handleCycleAdjustment(cycleIndex)}
        />
      )}
    </div>
  );
}

function TodayWorkoutCard({
  workout,
  exMap,
  lastDate,
  periodWeekName,
  isToday,
  onStart,
  onAdjustCycle,
  onOther,
  onEditDay,
}: {
  workout: Workout;
  exMap: Map<string, Exercise>;
  lastDate: string | null;
  periodWeekName: string | null;
  isToday: boolean;
  onStart: () => void;
  onAdjustCycle?: () => void;
  onOther: () => void;
  onEditDay: () => void;
}) {
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets, 0);
  return (
    <div className="hero">
      <div className="row" style={{ gap: 8 }}>
        <span className="tag-dot" style={{ background: workout.color ?? 'var(--accent)' }} />
        <span className="pill">{isToday ? 'Treino de hoje' : 'Treino do dia'}</span>
        {periodWeekName && <span className="pill pill--accent">{periodWeekName}</span>}
      </div>
      <h2 style={{ fontSize: 28, margin: '12px 0 2px' }}>{workout.name}</h2>
      <p className="muted" style={{ marginTop: 0 }}>{workout.description}</p>
      <div className="row wrap" style={{ gap: 8, marginBottom: 6 }}>
        <span className="pill">{workout.exercises.length} exercicios</span>
        <span className="pill">{totalSets} series</span>
        {workout.estimatedMinutes && <span className="pill">~{formatMinutes(workout.estimatedMinutes * 60)}</span>}
      </div>
      {lastDate && (
        <p className="faint" style={{ fontSize: 13 }}>Ultima execucao: {relativeDays(lastDate)}</p>
      )}
      <div className="stack-sm" style={{ marginTop: 6 }}>
        {[...workout.exercises].sort((a, b) => a.order - b.order).map((e, i) => (
          <div key={e.id} className="row-between" style={{ fontSize: 14 }}>
            <span className="muted">{i + 1}. {exMap.get(e.exerciseId)?.name ?? 'Exercicio'}</span>
            <span className="faint">{hasMixedPrescription(e) ? `${e.sets} séries variadas` : `${e.sets} × ${repRange(e.repMin, e.repMax)}`}</span>
          </div>
        ))}
      </div>
      {isToday && (
        <div className="stack-sm" style={{ marginTop: 14 }}>
          <button className="btn btn--primary btn--lg btn--block" onClick={onStart}>
            INICIAR TREINO
          </button>
          <div className="row" style={{gap:8}}><button className="btn btn--ghost grow" onClick={onOther}>Treinar outro</button><button className="btn btn--ghost grow" onClick={onEditDay}>Ajustar dia</button></div>
          {onAdjustCycle && (
            <button className="btn btn--ghost btn--block cycle-adjust-trigger" onClick={onAdjustCycle}>
              ↻ Ajustar ciclo a partir de hoje
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RestCard({
  program,
  workoutById,
  selected,
  isToday,
  onAdjustCycle,
  onTrain,
  onEditDay,
}: {
  program: NonNullable<ReturnType<typeof useActiveProgram>>;
  workoutById: Map<string, Workout>;
  selected: string;
  isToday: boolean;
  onAdjustCycle?: () => void;
  onTrain: () => void;
  onEditDay: () => void;
}) {
  const next = nextTrainingDay(program, selected, { inclusive: false });
  const nextWorkout = next ? workoutById.get(next.workoutId) : null;
  return (
    <div className="hero center">
      <div style={{ fontSize: 40 }}>😌</div>
      <h2 style={{ fontSize: 26, margin: '6px 0' }}>{isToday ? 'Hoje e descanso' : 'Dia de descanso'}</h2>
      {next && nextWorkout && (
        <p className="muted">
          Proximo: <strong style={{ color: 'var(--text)' }}>{nextWorkout.name}</strong>
          {' — '}
          {nextWorkout.description}
          <br />
          {weekdayLabel(weekday(next.date))} · {shortDate(next.date)}
        </p>
      )}
      {onAdjustCycle && (
        <button className="btn btn--primary btn--block" style={{ marginTop: 12 }} onClick={onAdjustCycle}>
          ↻ Escolher treino e ajustar ciclo
        </button>
      )}
      {isToday && <button className="btn btn--primary btn--block" style={{marginTop:10}} onClick={onTrain}>FAZER UM TREINO MESMO ASSIM</button>}
      <button className="btn btn--ghost btn--block" style={{marginTop:8}} onClick={onEditDay}>Ajustar este dia</button>
    </div>
  );
}
