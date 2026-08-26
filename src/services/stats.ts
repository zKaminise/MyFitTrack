// Metricas de evolucao e streak, derivadas das sessoes concluidas.
import type { Program, Session, Settings } from '@/domain/types';
import { sessionVolume, sessionDurationMinutes } from '@/domain/volume';
import { resolveDay } from '@/domain/scheduling';
import { todayISO, daysBetween, addDays } from '@/domain/dates';

export interface DashboardStats {
  monthCount: number;
  last30Count: number;
  totalVolume30: number;
  totalMinutes30: number;
  prCount30: number;
  streak: number;
}

export function computeDashboard(
  sessions: Session[],
  prDates: string[],
  program: Program | null,
  settings: Settings,
  today = todayISO(),
): DashboardStats {
  const completed = sessions.filter((s) => s.status === 'completed');
  const monthPrefix = today.slice(0, 7);
  const monthCount = completed.filter((s) => s.date.startsWith(monthPrefix)).length;

  const last30 = completed.filter((s) => daysBetween(s.date, today) <= 30 && daysBetween(s.date, today) >= 0);
  const totalVolume30 = last30.reduce((sum, s) => sum + sessionVolume(s), 0);
  const totalMinutes30 = last30.reduce((sum, s) => sum + sessionDurationMinutes(s), 0);
  const prCount30 = prDates.filter((d) => daysBetween(d, today) <= 30 && daysBetween(d, today) >= 0).length;

  return {
    monthCount,
    last30Count: last30.length,
    totalVolume30,
    totalMinutes30,
    prCount30,
    streak: computeStreak(sessions, program, settings, today),
  };
}

/**
 * Streak: numero de sessoes concluidas em uma sequencia continua a partir de
 * hoje (ou do ultimo treino). Dias de descanso planejado nao quebram a sequencia.
 * Um dia de treino perdido quebra apenas se settings.missedBreaksStreak for true.
 */
export function computeStreak(
  sessions: Session[],
  program: Program | null,
  settings: Settings,
  today = todayISO(),
): number {
  const doneDates = new Set(sessions.filter((s) => s.status === 'completed').map((s) => s.date));
  let streak = 0;
  let cursor = today;

  // Se hoje ainda nao treinou e nao e descanso, comeca a contar a partir de ontem.
  const todayRes = program ? resolveDay(program, today) : { isRest: true, workoutId: null };
  if (!doneDates.has(today) && !todayRes.isRest) {
    cursor = addDays(today, -1);
  }

  for (let i = 0; i < 400; i++) {
    if (doneDates.has(cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
      continue;
    }
    const res = program ? resolveDay(program, cursor) : { isRest: true, workoutId: null };
    if (res.isRest) {
      cursor = addDays(cursor, -1);
      continue; // descanso nao quebra
    }
    // Dia de treino sem sessao concluida
    if (settings.missedBreaksStreak) break;
    // Se nao quebra, continua olhando para tras, mas so ate encontrar um vazio real.
    // Para evitar streak infinito, paramos se nao houver nenhuma sessao anterior proxima.
    const hasEarlier = [...doneDates].some((d) => daysBetween(d, cursor) > 0);
    if (!hasEarlier) break;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
