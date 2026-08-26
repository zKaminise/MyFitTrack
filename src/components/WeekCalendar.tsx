import { useState } from 'react';
import type { Program, Session } from '@/domain/types';
import { resolveDay } from '@/domain/scheduling';
import { weekDates, weekdayLabel, weekday, dayNumber, todayISO, addDays, daysBetween } from '@/domain/dates';

interface Props {
  program: Program | null;
  sessions: Session[];
  selected: string;
  onSelect: (date: string) => void;
}

export function WeekCalendar({ program, sessions, selected, onSelect }: Props) {
  const [anchor, setAnchor] = useState(selected);
  const days = weekDates(anchor);
  const today = todayISO();
  const doneDates = new Set(sessions.filter((s) => s.status === 'completed').map((s) => s.date));

  function markFor(date: string): { cls: string; ch: string } {
    if (doneDates.has(date)) return { cls: 'mark-done', ch: '✓' };
    const res = program ? resolveDay(program, date) : { isRest: true, workoutId: null };
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
