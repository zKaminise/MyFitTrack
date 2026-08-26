// Utilitarios de data trabalhando em horario local, sem dependencias.
import type { ISODate } from './types';

/** Retorna "AAAA-MM-DD" no fuso local para uma Date. */
export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Converte "AAAA-MM-DD" para Date local (meia-noite). */
export function fromISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function addDays(s: ISODate, days: number): ISODate {
  const d = fromISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Numero de dias inteiros entre duas datas (b - a). Ignora horas. */
export function daysBetween(a: ISODate, b: ISODate): number {
  const da = fromISODate(a);
  const db = fromISODate(b);
  const ms = db.getTime() - da.getTime();
  return Math.round(ms / 86_400_000);
}

/** 0 = Domingo ... 6 = Sabado. */
export function weekday(s: ISODate): number {
  return fromISODate(s).getDay();
}

/** Domingo da semana que contem `s`. */
export function startOfWeek(s: ISODate): ISODate {
  return addDays(s, -weekday(s));
}

/** Array de 7 datas (Dom..Sab) da semana que contem `s`. */
export function weekDates(s: ISODate): ISODate[] {
  const start = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
export function weekdayLabel(weekdayNum: number): string {
  return WEEKDAY_LABELS[weekdayNum] ?? '';
}

const MONTH_LABELS = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
];

export function dayNumber(s: ISODate): number {
  return fromISODate(s).getDate();
}

export function monthLabel(s: ISODate): string {
  return MONTH_LABELS[fromISODate(s).getMonth()] ?? '';
}

/** ex: "24 AGO" */
export function shortDate(s: ISODate): string {
  return `${dayNumber(s)} ${monthLabel(s)}`;
}

/** ex: "24/08/2026" */
export function longDate(s: ISODate): string {
  const d = fromISODate(s);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Texto relativo simples: "hoje", "ontem", "ha N dias". */
export function relativeDays(from: ISODate, to: ISODate = todayISO()): string {
  const diff = daysBetween(from, to);
  if (diff <= 0) return 'hoje';
  if (diff === 1) return 'ontem';
  if (diff < 7) return `ha ${diff} dias`;
  if (diff < 14) return 'ha 1 semana';
  if (diff < 60) return `ha ${Math.floor(diff / 7)} semanas`;
  return `ha ${Math.floor(diff / 30)} meses`;
}
