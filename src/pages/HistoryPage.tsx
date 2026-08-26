import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompletedSessions, usePersonalRecords, useActiveProgram } from '@/hooks/useData';
import { useSettings } from '@/store/settingsStore';
import { computeDashboard } from '@/services/stats';
import { sessionVolume, sessionCompletedSets, sessionDurationMinutes } from '@/domain/volume';
import { shortDate } from '@/domain/dates';
import { formatMinutes, formatNumber } from '@/lib/labels';
import { VolumeChart } from '@/components/Charts';

export default function HistoryPage() {
  const nav = useNavigate();
  const sessions = useCompletedSessions();
  const prs = usePersonalRecords();
  const program = useActiveProgram();
  const { settings } = useSettings();
  const [filter, setFilter] = useState<string>('all');

  const stats = useMemo(
    () => computeDashboard(sessions, prs.map((p) => p.date), program ?? null, settings),
    [sessions, prs, program, settings],
  );

  const workoutNames = Array.from(new Set(sessions.map((s) => s.workoutName)));
  const filtered = filter === 'all' ? sessions : sessions.filter((s) => s.workoutName === filter);

  return (
    <div className="screen">
      <h1 className="page-title">Historico</h1>

      <div className="section-title" style={{ marginTop: 0 }}>Evolucao</div>
      <div className="stat-grid">
        <Stat val={String(stats.monthCount)} lbl="Treinos no mes" />
        <Stat val={String(stats.last30Count)} lbl="Ultimos 30 dias" />
        <Stat val={`${stats.streak}🔥`} lbl="Streak" />
        <Stat val={formatNumber(stats.totalVolume30)} lbl="Volume 30d (kg)" />
        <Stat val={formatMinutes(stats.totalMinutes30 * 60)} lbl="Tempo 30d" />
        <Stat val={String(stats.prCount30)} lbl="Recordes 30d" />
      </div>

      {sessions.length > 0 && (
        <>
          <div className="section-title">Volume por sessao</div>
          <div className="card">
            <VolumeChart
              data={[...sessions].reverse().slice(-14).map((s) => ({ date: shortDate(s.date), volume: sessionVolume(s) }))}
            />
          </div>
        </>
      )}

      <div className="section-title">Sessoes</div>
      <div className="chips" style={{ marginBottom: 10 }}>
        <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
        {workoutNames.map((n) => (
          <button key={n} className={`chip ${filter === n ? 'active' : ''}`} onClick={() => setFilter(n)}>{n}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty card"><span className="emoji">📈</span>Nenhuma sessao registrada ainda.</div>
      )}

      <div className="stack-sm">
        {filtered.map((s) => (
          <button key={s.id} className="card card-tap" style={{ textAlign: 'left' }} onClick={() => nav(`/history/${s.id}`)}>
            <div className="row-between">
              <div>
                <div className="faint" style={{ fontSize: 12, fontWeight: 700 }}>{shortDate(s.date)}</div>
                <h3 style={{ fontSize: 17 }}>{s.workoutName}</h3>
                <span className="muted" style={{ fontSize: 13 }}>{s.workoutDescription}</span>
              </div>
              <span className="faint">›</span>
            </div>
            <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
              <span className="pill">{formatMinutes(sessionDurationMinutes(s) * 60)}</span>
              <span className="pill">{sessionCompletedSets(s)} series</span>
              <span className="pill">{formatNumber(sessionVolume(s))} kg</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ val, lbl }: { val: string; lbl: string }) {
  return (
    <div className="stat">
      <div className="stat-val">{val}</div>
      <div className="stat-lbl">{lbl}</div>
    </div>
  );
}
