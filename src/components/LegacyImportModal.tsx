import { useState } from 'react';
import type { LegacyCounts } from '@/services/migration';
import { importLegacyToUser, skipLegacyImport } from '@/services/migration';
import { useAuth } from '@/store/authStore';
import { useSettings } from '@/store/settingsStore';
import { toast } from '@/ui/feedback';

export function LegacyImportModal({ counts, onDone }: { counts: LegacyCounts; onDone: () => void }) {
  const user = useAuth((s) => s.user)!;
  const [busy, setBusy] = useState(false);

  async function doImport() {
    setBusy(true);
    await importLegacyToUser(user.id);
    await useSettings.getState().load();
    toast('Dados importados para sua conta');
    onDone();
  }

  function startEmpty() {
    skipLegacyImport();
    onDone();
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ fontSize: 44, textAlign: 'center' }}>📦</div>
        <div className="auth-head" style={{ textAlign: 'center' }}>
          <h1>Encontramos seus treinos</h1>
          <p>Encontramos dados criados anteriormente neste dispositivo.</p>
        </div>
        <div className="stat-grid">
          <div className="stat"><div className="stat-val">{counts.workouts}</div><div className="stat-lbl">Treinos</div></div>
          <div className="stat"><div className="stat-val">{counts.sessions}</div><div className="stat-lbl">Sessoes</div></div>
          <div className="stat"><div className="stat-val">{counts.exercises}</div><div className="stat-lbl">Exercicios</div></div>
        </div>
        <button className="auth-btn" onClick={doImport} disabled={busy}>
          {busy ? <span className="spinner" /> : 'Importar para minha conta'}
        </button>
        <button className="auth-btn auth-btn--google" onClick={startEmpty} disabled={busy}>
          Comecar uma conta vazia
        </button>
        <p className="auth-foot" style={{ fontSize: 12 }}>
          Nada e apagado antes de concluir. Seus dados continuam neste dispositivo.
        </p>
      </div>
    </div>
  );
}
