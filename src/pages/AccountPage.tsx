import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/components';
import { SyncIndicator } from '@/components/SyncIndicator';
import { useAuth } from '@/store/authStore';
import { auth, authErrorMessage } from '@/auth';
import { deleteLocalUserData } from '@/auth/localAuth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { confirmAction, toast } from '@/ui/feedback';
import { useSyncStatus } from '@/sync/status';

export default function AccountPage() {
  const nav = useNavigate();
  const { user, mode, updateName, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [pwOpen, setPwOpen] = useState(false);

  if (!user) return null;

  async function saveName() {
    if (!name.trim() || name === user!.name) return;
    try {
      await updateName(name.trim());
      toast('Nome atualizado');
    } catch (e) {
      toast(authErrorMessage(e));
    }
  }

  async function doDelete() {
    const userId = user!.id;
    const ok = await confirmAction({
      title: 'Excluir minha conta?',
      message: 'Esta acao e permanente. Seus treinos, sessoes e configuracoes serao apagados deste dispositivo' + (isSupabaseConfigured ? ' e da nuvem.' : '.'),
      danger: true,
      confirmLabel: 'Excluir definitivamente',
    });
    if (!ok) return;
    try {
      await auth.deleteAccount();
      await deleteLocalUserData(userId);
      toast('Conta excluida');
    } catch (e) {
      toast(authErrorMessage(e));
      return;
    }
    await signOut();
  }

  return (
    <div className="screen">
      <BackHeader title="Minha conta" right={<SyncIndicator />} />

      <div className="card stack">
        <div className="field">
          <label>Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
        </div>
        <div className="field">
          <label>E-mail</label>
          <input className="input" value={user.email} readOnly disabled />
        </div>
        <span className="faint" style={{ fontSize: 12 }}>
          {mode === 'supabase' ? 'Conta sincronizada na nuvem.' : 'Conta local neste dispositivo (sem nuvem configurada).'}
        </span>
      </div>

      <DevSyncPanel />

      <div className="section-title">Seguranca</div>
      <button className="list-item card-tap" onClick={() => setPwOpen(true)}>
        <span style={{ fontSize: 20 }}>🔑</span>
        <div className="grow"><div className="li-title">Alterar senha</div></div>
        <span className="faint">›</span>
      </button>

      <div className="section-title">Sessao</div>
      <div className="stack-sm">
        <button className="btn btn--block" onClick={async () => { await signOut(); nav('/'); }}>Sair</button>
        <button className="btn btn--block btn--danger" onClick={doDelete}>Excluir minha conta</button>
      </div>

      {pwOpen && <ChangePasswordSheet onClose={() => setPwOpen(false)} />}
    </div>
  );
}

function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const mode = useAuth((state) => state.mode);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (next !== confirm) { toast('As senhas nao coincidem'); return; }
    setBusy(true);
    try {
      await auth.changePassword(current, next);
      toast('Senha alterada');
      onClose();
    } catch (e) {
      toast(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title="Alterar senha">
      <div className="stack">
        {mode === 'local' && <div className="field"><label>Senha atual</label><input className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>}
        <div className="field"><label>Nova senha</label><input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></div>
        <div className="field"><label>Confirmar nova senha</label><input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        <button className="btn btn--primary btn--block" onClick={submit} disabled={busy}>{busy ? 'Salvando...' : 'Salvar nova senha'}</button>
      </div>
    </Sheet>
  );
}

export function DevSyncPanel() {
  const user = useAuth((state) => state.user);
  const mode = useAuth((state) => state.mode);
  const sync = useSyncStatus();
  if (!import.meta.env.DEV || !user) return null;
  return (
    <div className="card dev-sync-panel">
      <strong>Diagnostico de sincronizacao</strong>
      <dl>
        <div><dt>User</dt><dd>{user.name} · {user.id.slice(0, 8)}…</dd></div>
        <div><dt>Network</dt><dd>{sync.online ? 'Online' : 'Offline'}</dd></div>
        <div><dt>Cloud</dt><dd>{mode === 'supabase' ? 'Connected' : 'Local mode'}</dd></div>
        <div><dt>Pending</dt><dd>{sync.pending}</dd></div>
        <div><dt>Last sync</dt><dd>{sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString('pt-BR') : '—'}</dd></div>
      </dl>
    </div>
  );
}
