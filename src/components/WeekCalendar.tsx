import { useState } from 'react';
import type { Program, ScheduleOverride, Session } from '@/domain/types';
import { resolveSchedule } from '@/domain/scheduleOverrides';
import { weekDates, weekdayLabel, weekday, dayNumber, todayISO, addDays, daysBetween } from '@/domain/dates';

interface Props {
  program: Program | null;
  sessions: Session[];
  selected: string;
  onSelect: (date: string) => void;
  overrides?: ScheduleOverride[];
}

export function WeekCalendar({ program, sessions, selected, onSelect, overrides = [] }: Props) {
  const [anchor, setAnchor] = useState(selected);
  const days = weekDates(anchor);
  const today = todayISO();
  const doneCount = new Map<string, number>();
  sessions.filter((s) => s.status === 'completed').forEach(s => doneCount.set(s.date, (doneCount.get(s.date) ?? 0) + 1));

  function markFor(date: string): { cls: string; ch: string } {
    const count = doneCount.get(date) ?? 0;
    if (count) return { cls: 'mark-done', ch: count > 1 ? String(count) : '✓' };
    const res = program ? resolveSchedule(program, date, overrides) : { isRest: true, workoutId: null };
    if (res.isRest) return { cls: 'mark-rest', ch: '—' };
    // Dia de treino
    if (daysBetween(date, today) > 0) return { cls: 'mark-missed', ch: '!' };
    return { cls: 'mark-planned', ch: '●' };
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <button className="icon-btn" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Semana anterior">
          ‹
        </button>
        <span className="faint" style={{ fontSize: 13, fontWeight: 600 }}>
          {daysBetween(todayISO(), anchor) < 7 && daysBetween(anchor, todayISO()) < 7 && weekday(today) >= 0
            ? 'Esta semana'
            : `Semana de ${dayNumber(days[0])}`}
        </span>
        <button className="icon-btn" onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Proxima semana">
          ›
        </button>
      </div>
      <div className="week">
        {days.map((d) => {
          const mark = markFor(d);
          const isToday = d === today;
          const isSelected = d === selected;
          return (
            <button
              key={d}
              className={`week-day ${isToday ? 'today' : ''}`}
              style={isSelected && !isToday ? { borderColor: 'var(--text-dim)' } : undefined}
              onClick={() => onSelect(d)}
            >
              <span className="wd-label">{weekdayLabel(weekday(d))}</span>
              <span className="wd-num">{dayNumber(d)}</span>
              <span className={`wd-mark ${mark.cls}`}>{mark.ch}</span>
              {overrides.some(o => o.date === d && !o.deletedAt) && <span className="wd-adjusted" aria-label="Ajustado">•</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
