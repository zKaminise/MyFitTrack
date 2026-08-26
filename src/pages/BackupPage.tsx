import { useRef, useState } from 'react';
import { BackHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/components';
import { useBackups } from '@/hooks/useData';
import { confirmAction, toast } from '@/ui/feedback';
import {
  exportBackupToFile,
  parseBackupFile,
  restoreBackup,
  mergeBackup,
  createSnapshot,
  restoreSnapshot,
} from '@/services/backup';
import { backupRepo } from '@/repositories/dexie';
import { useSettings } from '@/store/settingsStore';
import { useSession } from '@/store/sessionStore';
import type { BackupData } from '@/domain/types';
import { longDate } from '@/domain/dates';

export default function BackupPage() {
  const snapshots = useBackups() ?? [];
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ data: BackupData; summary: { exportedAt: string; workouts: number; sessions: number; exercises: number } } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    e.target.value = '';
    const result = parseBackupFile(text);
    if (!result.ok) { toast(`Backup invalido: ${result.error}`); return; }
    setPending({ data: result.data, summary: result.summary });
  }

  async function confirmRestore() {
    if (!pending) return;
    if (restoreMode === 'merge') await mergeBackup(pending.data);
    else await restoreBackup(pending.data);
    await useSettings.getState().load();
    await useSession.getState().load();
    setPending(null);
    toast('Backup restaurado');
  }

  async function reloadStores() {
    await useSettings.getState().load();
    await useSession.getState().load();
  }

  return (
    <div className="screen">
      <BackHeader title="Backup" />

      <div className="card stack">
        <p className="muted" style={{ marginTop: 0 }}>Uma copia extra dos dados da sua conta, independente da nuvem.</p>
        <button className="btn btn--primary btn--block" onClick={() => exportBackupToFile()}>⬇ Exportar meus dados</button>
        <button className="btn btn--block" onClick={() => fileInput.current?.click()}>⬆ Importar backup</button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      </div>

      <div className="section-title">Snapshots internos</div>
      <p className="faint" style={{ fontSize: 13, marginTop: 0 }}>Protecao contra exclusao acidental. Os 5 automaticos mais recentes sao mantidos.</p>
      <button className="btn btn--block" onClick={async () => { await createSnapshot('Manual', false); toast('Snapshot criado'); }}>Criar snapshot agora</button>

      <div className="stack-sm" style={{ marginTop: 12 }}>
        {snapshots.length === 0 && <p className="empty">Nenhum snapshot ainda.</p>}
        {snapshots.map((s) => (
          <div key={s.id} className="list-item">
            <div className="grow">
              <div className="li-title">{new Date(s.createdAt).toLocaleString('pt-BR')}</div>
              <div className="li-sub">{s.auto ? 'Automatico' : 'Manual'} · {s.label}</div>
            </div>
            <button
              className="btn btn--sm"
              onClick={async () => {
                const ok = await confirmAction({ title: 'Restaurar este snapshot?', message: 'Os dados atuais serao substituidos.', danger: true, confirmLabel: 'Restaurar' });
                if (!ok) return;
                const done = await restoreSnapshot(s.id);
                if (done) { await reloadStores(); toast('Snapshot restaurado'); } else toast('Falha ao restaurar');
              }}
            >
              Restaurar
            </button>
            <button className="icon-btn btn--danger" onClick={() => backupRepo.remove(s.id)} aria-label="Apagar">✕</button>
          </div>
        ))}
      </div>

      {pending && (
        <Sheet open onClose={() => setPending(null)} title="Restaurar backup">
          <p className="muted" style={{ marginTop: 0 }}>Escolha como trazer este backup para a conta atual.</p>
          <div className="segmented" style={{ marginBottom: 14 }}>
            <button className={restoreMode === 'merge' ? 'active' : ''} onClick={() => setRestoreMode('merge')}>Mesclar</button>
            <button className={restoreMode === 'replace' ? 'active' : ''} onClick={() => setRestoreMode('replace')}>Substituir</button>
          </div>
          <p className="faint" style={{ fontSize: 13, marginTop: 0 }}>
            {restoreMode === 'merge' ? 'Mantem seus dados atuais e adiciona/atualiza os do backup.' : 'Remove os dados atuais desta conta que nao existirem no backup.'}
          </p>
          <div className="stat-grid" style={{ marginBottom: 8 }}>
            <div className="stat"><div className="stat-val">{pending.summary.workouts}</div><div className="stat-lbl">Treinos</div></div>
            <div className="stat"><div className="stat-val">{pending.summary.sessions}</div><div className="stat-lbl">Sessoes</div></div>
            <div className="stat"><div className="stat-val">{pending.summary.exercises}</div><div className="stat-lbl">Exercicios</div></div>
          </div>
          <p className="faint" style={{ fontSize: 13 }}>Backup de {longDate(pending.summary.exportedAt.slice(0, 10))}</p>
          <div className="stack-sm" style={{ marginTop: 12 }}>
            <button className={`btn btn--block ${restoreMode === 'replace' ? 'btn--danger' : 'btn--primary'}`} onClick={confirmRestore}>{restoreMode === 'merge' ? 'Mesclar backup' : 'Substituir meus dados'}</button>
            <button className="btn btn--block btn--ghost" onClick={() => setPending(null)}>Cancelar</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
