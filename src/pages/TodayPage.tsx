import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WeekCalendar } from '@/components/WeekCalendar';
import {
  useActiveProgram,
  useWorkouts,
  useSessions,
  useExerciseMap,
  usePeriodization,
} from '@/hooks/useData';
import { resolveDay, nextTrainingDay } from '@/domain/scheduling';
import { currentPeriodizationWeek } from '@/domain/periodization';
import { todayISO, relativeDays, shortDate, longDate, weekdayLabel, weekday } from '@/domain/dates';
import type { Workout } from '@/domain/types';
import { useSession } from '@/store/sessionStore';
import { buildSession } from '@/services/sessionService';
import { confirmAction } from '@/ui/feedback';
import { repRange, formatMinutes } from '@/lib/labels';
import type { Exercise } from '@/domain/types';
import { useAuth } from '@/store/authStore';

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
  const active = useSession((s) => s.active);
  const start = useSession((s) => s.start);

  const today = todayISO();
  const [selected, setSelected] = useState(today);

  const workoutById = new Map(workouts.map((w) => [w.id, w]));
  const resolution = program ? resolveDay(program, selected) : null;
  const selectedWorkout = resolution?.workoutId ? workoutById.get(resolution.workoutId) : null;

  const periodWeek =
    program && periodization
      ? currentPeriodizationWeek(program, periodization, selected)?.week ?? null
      : null;

  const lastDoneFor = (workoutId: string) =>
    sessions.find((s) => s.status === 'completed' && s.workoutId === workoutId)?.date ?? null;

  async function handleStart(workout: Workout) {
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
    });
    await start(session);
    nav('/session');
  }

  const isToday = selected === today;
  const sessionOnSelected = sessions.find((s) => s.date === selected && s.status === 'completed');

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
        <WeekCalendar program={program ?? null} sessions={sessions} selected={selected} onSelect={setSelected} />
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
        />
      )}

      {program && !program.paused && !active && resolution?.isRest && (
        <RestCard program={program} workoutById={workoutById} selected={selected} isToday={isToday} />
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
}: {
  workout: Workout;
  exMap: Map<string, Exercise>;
  lastDate: string | null;
  periodWeekName: string | null;
  isToday: boolean;
  onStart: () => void;
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
            <span className="faint">{e.sets} × {repRange(e.repMin, e.repMax)}</span>
          </div>
        ))}
      </div>
      {isToday && (
        <button className="btn btn--primary btn--lg btn--block" style={{ marginTop: 14 }} onClick={onStart}>
          INICIAR TREINO
        </button>
      )}
    </div>
  );
}

function RestCard({
  program,
  workoutById,
  selected,
  isToday,
}: {
  program: NonNullable<ReturnType<typeof useActiveProgram>>;
  workoutById: Map<string, Workout>;
  selected: string;
  isToday: boolean;
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
    </div>
  );
}
