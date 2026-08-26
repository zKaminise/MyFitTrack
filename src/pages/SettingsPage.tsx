import { useNavigate } from 'react-router-dom';
import { BackHeader } from '@/ui/PageHeader';
import { useSettings } from '@/store/settingsStore';
import { confirmAction, toast } from '@/ui/feedback';
import { OfflineMediaCard } from '@/components/OfflineMediaCard';
import { SyncIndicator } from '@/components/SyncIndicator';
import { clearCurrentUserHistory, resetCurrentUserTrainingData } from '@/services/accountData';

export default function SettingsPage() {
  const nav = useNavigate();
  const { settings, update } = useSettings();
  async function clearHistory() {
    const ok = await confirmAction({ title: 'Limpar todo o historico?', message: 'Todas as suas sessoes e recordes serao apagados. Treinos e programa permanecem.', danger: true, confirmLabel: 'Limpar historico' });
    if (!ok) return;
    await clearCurrentUserHistory();
    toast('Historico limpo');
  }

  async function resetApp() {
    const ok = await confirmAction({ title: 'Resetar meus dados?', message: 'Remove seus treinos, programa, historico e exercicios personalizados deste dispositivo e da nuvem. Sua conta permanece. Considere exportar um backup antes.', danger: true, confirmLabel: 'Resetar local e nuvem' });
    if (!ok) return;
    await resetCurrentUserTrainingData();
    await update({ onboarded: false, favoriteExerciseIds: [] });
    toast('Dados resetados');
    nav('/');
  }

  return (
    <div className="screen">
      <BackHeader title="Configuracoes" right={<SyncIndicator />} />

      <div className="section-title" style={{ marginTop: 0 }}>Aparencia</div>
      <div className="card">
        <Segmented
          value={settings.theme}
          options={[{ v: 'dark', l: 'Escuro' }, { v: 'light', l: 'Claro' }, { v: 'system', l: 'Sistema' }]}
          onChange={(v) => update({ theme: v as any })}
        />
      </div>

      <div className="section-title">Unidade de peso</div>
      <div className="card">
        <Segmented value={settings.unit} options={[{ v: 'kg', l: 'kg' }, { v: 'lb', l: 'lb' }]} onChange={(v) => update({ unit: v as any })} />
      </div>

      <div className="section-title">Metrica de intensidade</div>
      <div className="card">
        <Segmented value={settings.intensityMetric} options={[{ v: 'none', l: 'Nenhuma' }, { v: 'rir', l: 'RIR' }, { v: 'rpe', l: 'RPE' }]} onChange={(v) => update({ intensityMetric: v as any })} />
      </div>

      <div className="section-title">Treino</div>
      <div className="card stack">
        <div className="field">
          <label>Descanso padrao (segundos)</label>
          <input className="input" type="number" inputMode="numeric" value={settings.defaultRestSeconds} onChange={(e) => update({ defaultRestSeconds: Math.max(0, Number(e.target.value)) })} />
        </div>
        <div className="field">
          <label>Percentual para sugerir aumento de carga</label>
          <Segmented
            value={String(settings.progressionThresholdPct)}
            options={[{ v: '50', l: '50%' }, { v: '75', l: '75%' }, { v: '100', l: '100%' }]}
            onChange={(v) => update({ progressionThresholdPct: Number(v) })}
          />
        </div>
        <Toggle label="Double progression" checked={settings.useDoubleProgression} onChange={(v) => update({ useDoubleProgression: v })} />
        <Toggle label="Iniciar timer automaticamente" checked={settings.autoStartTimer} onChange={(v) => update({ autoStartTimer: v })} />
        <Toggle label="Vibracao" checked={settings.vibration} onChange={(v) => update({ vibration: v })} />
        <Toggle label="Som ao terminar descanso" checked={settings.sound} onChange={(v) => update({ sound: v })} />
        <Toggle label="Treino perdido quebra streak" checked={settings.missedBreaksStreak} onChange={(v) => update({ missedBreaksStreak: v })} />
      </div>

      <div className="section-title">Offline</div>
      <OfflineMediaCard />

      <div className="section-title">Backup</div>
      <button className="list-item card-tap" onClick={() => nav('/backup')}>
        <span style={{ fontSize: 20 }}>💾</span>
        <div className="grow"><div className="li-title">Backup e restauracao</div><div className="li-sub">Exportar, importar e snapshots</div></div>
        <span className="faint">›</span>
      </button>

      <div className="section-title">Dados</div>
      <div className="stack-sm">
        <button className="btn btn--block btn--danger" onClick={clearHistory}>Limpar historico</button>
        <button className="btn btn--block btn--danger" onClick={resetApp}>Resetar meus dados</button>
      </div>
    </div>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      {options.map((o) => (
        <button key={o.v} className={`btn grow ${value === o.v ? 'btn--primary' : ''}`} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="row-between" style={{ width: '100%', background: 'none', color: 'inherit', padding: '4px 0' }} onClick={() => onChange(!checked)}>
      <span>{label}</span>
      <span style={{ width: 48, height: 28, borderRadius: 999, background: checked ? 'var(--accent)' : 'var(--card-2)', position: 'relative', transition: 'background .15s', border: '1px solid var(--border)', flex: 'none' }}>
        <span style={{ position: 'absolute', top: 2, left: checked ? 22 : 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
      </span>
    </button>
  );
}
