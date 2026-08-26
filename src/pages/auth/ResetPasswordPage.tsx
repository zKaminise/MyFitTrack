import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, authErrorMessage } from '@/auth';
import { useAuth } from '@/store/authStore';
import { BrandLogo } from '@/components/BrandLogo';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await auth.changePassword('', password);
      setDone(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo"><BrandLogo size={34} /></div>
          <span>MyFitTrack</span>
        </div>
        {done ? (
          <div className="auth-form auth-form--center">
            <div className="auth-success-icon">✓</div>
            <div className="auth-head">
              <h1>Senha atualizada</h1>
              <p>Sua nova senha já está ativa. Entre novamente com segurança.</p>
            </div>
            <button className="auth-btn" onClick={async () => { await auth.signOut(); navigate('/', { replace: true }); }}>
              VOLTAR PARA O LOGIN
            </button>
          </div>
        ) : user ? (
          <form className="auth-form" onSubmit={submit}>
            <div className="auth-head">
              <h1>Crie uma nova senha</h1>
              <p>Escolha uma senha segura com pelo menos 6 caracteres.</p>
            </div>
            {error && <div className="auth-error"><span>!</span><span>{error}</span></div>}
            <div className="auth-field">
              <label htmlFor="new-password">Nova senha</label>
              <input id="new-password" className="auth-input" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="auth-field">
              <label htmlFor="confirm-password">Confirmar nova senha</label>
              <input id="confirm-password" className="auth-input" type="password" autoComplete="new-password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <button className="auth-btn" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : 'ATUALIZAR SENHA'}</button>
          </form>
        ) : (
          <div className="auth-form auth-form--center">
            <div className="auth-head">
              <h1>Link invalido ou expirado</h1>
              <p>Solicite um novo link de recuperacao na tela de login.</p>
            </div>
            <button className="auth-btn" onClick={() => navigate('/', { replace: true })}>VOLTAR PARA O LOGIN</button>
          </div>
        )}
      </div>
    </div>
  );
}
