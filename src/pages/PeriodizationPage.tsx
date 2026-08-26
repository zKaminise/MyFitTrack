import { useState } from 'react';
import { BackHeader } from '@/ui/PageHeader';
import { usePeriodizations } from '@/hooks/useData';
import { periodizationRepo } from '@/repositories/dexie';
import { confirmAction, toast } from '@/ui/feedback';
import type { Periodization, PeriodizationWeek } from '@/domain/types';
import { uuid, nowISO } from '@/lib/id';

function newWeek(order: number, deload = false): PeriodizationWeek {
  return {
    id: uuid(), order,
    name: deload ? 'Deload' : `Semana ${order + 1}`,
    repMin: deload ? 8 : 10, repMax: deload ? 10 : 12,
    intensityPct: deload ? 70 : 100, setsDelta: deload ? -1 : 0,
    targetRir: null, targetRpe: null, restSeconds: null, isDeload: deload,
  };
}

export default function PeriodizationPage() {
  const periodizations = usePeriodizations() ?? [];
  const [openId, setOpenId] = useState<string | null>(null);

  async function create() {
    const p: Periodization = {
      id: uuid(), createdAt: nowISO(), updatedAt: nowISO(), name: 'Nova periodizacao',
      weeks: [newWeek(0), newWeek(1)],
    };
    await periodizationRepo.put(p);
    setOpenId(p.id);
  }

  const editing = periodizations.find((p) => p.id === openId);

  if (editing) return <Editor periodization={editing} onBack={() => setOpenId(null)} />;

  return (
    <div className="screen">
      <BackHeader title="Periodizacao" right={<button className="btn btn--primary btn--sm" onClick={create}>+ Nova</button>} />
      <p className="muted" style={{ marginTop: 0 }}>Opcional. Sem periodizacao, seus treinos usam sempre as series/reps configuradas.</p>
      <div className="stack-sm">
        {periodizations.length === 0 && <div className="empty card"><span className="emoji">📐</span>Nenhuma periodizacao.</div>}
        {periodizations.map((p) => (
          <button key={p.id} className="card card-tap" style={{ textAlign: 'left' }} onClick={() => setOpenId(p.id)}>
            <h3 style={{ fontSize: 18 }}>{p.name}</h3>
            <span className="muted" style={{ fontSize: 14 }}>{p.weeks.length} semanas · {p.weeks.map((w) => w.name).join(' · ')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Editor({ periodization, onBack }: { periodization: Periodization; onBack: () => void }) {
  const save = (fn: (p: Periodization) => Periodization) => periodizationRepo.put({ ...fn(periodization), updatedAt: nowISO() });
  const weeks = [...periodization.weeks].sort((a, b) => a.order - b.order);
  const updateWeek = (id: string, patch: Partial<PeriodizationWeek>) =>
    save((p) => ({ ...p, weeks: p.weeks.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));

  return (
    <div className="screen">
      <BackHeader title="Editar periodizacao" right={<button className="icon-btn" onClick={onBack}>✓</button>} />
      <div className="field" style={{ marginBottom: 14 }}>
        <label>Nome</label>
        <input className="input" value={periodization.name} onChange={(e) => save((p) => ({ ...p, name: e.target.value }))} />
      </div>

      <div className="stack">
        {weeks.map((w, i) => (
          <div key={w.id} className="card">
            <div className="row-between">
              <input className="input" style={{ maxWidth: 180 }} value={w.name} onChange={(e) => updateWeek(w.id, { name: e.target.value })} />
              <div className="row" style={{ gap: 4 }}>
                {w.isDeload && <span className="pill pill--accent">deload</span>}
                <button className="icon-btn btn--danger" onClick={() => save((p) => ({ ...p, weeks: p.weeks.filter((x) => x.id !== w.id).map((x, idx) => ({ ...x, order: idx })) }))}>✕</button>
              </div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <Num label="Rep min" v={w.repMin} on={(v) => updateWeek(w.id, { repMin: v })} />
              <Num label="Rep max" v={w.repMax} on={(v) => updateWeek(w.id, { repMax: v })} />
              <Num label="Intens. %" v={w.intensityPct} on={(v) => updateWeek(w.id, { intensityPct: v })} />
            </div>
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <Num label="Series +/-" v={w.setsDelta} on={(v) => updateWeek(w.id, { setsDelta: v })} allowNeg />
              <div className="field grow">
                <label>RIR</label>
                <input className="input" type="number" value={w.targetRir ?? ''} placeholder="—" onChange={(e) => updateWeek(w.id, { targetRir: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div className="field grow">
                <label>Descanso</label>
                <input className="input" type="number" value={w.restSeconds ?? ''} placeholder="—" onChange={(e) => updateWeek(w.id, { restSeconds: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
            </div>
            <span className="faint" style={{ fontSize: 12 }}>Semana {i + 1}</span>
          </div>
        ))}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button className="btn grow" onClick={() => save((p) => ({ ...p, weeks: [...p.weeks, newWeek(p.weeks.length)] }))}>+ Semana</button>
        <button className="btn grow" onClick={() => save((p) => ({ ...p, weeks: [...p.weeks, newWeek(p.weeks.length, true)] }))}>+ Deload</button>
      </div>

      <button
        className="btn btn--danger btn--block" style={{ marginTop: 16 }}
        onClick={async () => {
          const ok = await confirmAction({ title: 'Apagar periodizacao?', danger: true, confirmLabel: 'Apagar' });
          if (ok) { await periodizationRepo.remove(periodization.id); toast('Periodizacao apagada'); onBack(); }
        }}
      >
        Apagar periodizacao
      </button>
    </div>
  );
}

function Num({ label, v, on, allowNeg }: { label: string; v: number; on: (v: number) => void; allowNeg?: boolean }) {
  return (
    <div className="field grow">
      <label>{label}</label>
      <input className="input" type="number" inputMode="numeric" value={v} onChange={(e) => { const n = Number(e.target.value); on(allowNeg ? n : Math.max(0, n)); }} />
    </div>
  );
}
