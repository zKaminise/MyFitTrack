import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, authErrorMessage } from '@/auth';
import { parseAuthCallbackError, isExpiredAuthLink } from '@/auth/redirects';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/store/authStore';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const callbackError = useMemo(() => parseAuthCallbackError(window.location.href), []);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setProcessing(false), 700);
    return () => window.clearTimeout(timeout);
  }, []);

  const resend = async () => {
    if (!email.trim()) {
      setMessage('Informe o e-mail usado no cadastro.');
      return;
    }
    setBusy(true);
    try {
      await auth.resendConfirmation(email);
      setMessage('Novo link enviado. Confira também a pasta de spam.');
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo"><BrandLogo size={34} /></div>
          <span>MyFitTrack</span>
        </div>

        {callbackError ? (
          <div className="auth-form auth-form--center">
            <div className="auth-callback-icon auth-callback-icon--error">!</div>
            <div className="auth-head">
              <h1>Não conseguimos confirmar seu e-mail</h1>
              <p>
                {isExpiredAuthLink(callbackError)
                  ? 'O link expirou. Solicite um novo link para concluir seu cadastro.'
                  : 'O link pode ter expirado ou já ter sido utilizado.'}
              </p>
            </div>
            <div className="auth-field auth-field--left">
              <label htmlFor="callback-email">E-mail da conta</label>
              <input
                id="callback-email"
                className="auth-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
              />
            </div>
            {message && <div className="auth-inline-message">{message}</div>}
            <button className="auth-btn" onClick={resend} disabled={busy}>
              {busy ? <span className="spinner" /> : 'REENVIAR LINK'}
            </button>
            <button className="auth-link" onClick={() => navigate('/', { replace: true })}>Voltar para entrar</button>
          </div>
        ) : user ? (
          <div className="auth-form auth-form--center">
            <div className="auth-success-icon">✓</div>
            <div className="auth-head">
              <h1>E-mail confirmado</h1>
              <p>Sua conta está pronta. Seus treinos já podem ser sincronizados com segurança.</p>
            </div>
            <button className="auth-btn" onClick={() => navigate('/', { replace: true })}>CONTINUAR</button>
          </div>
        ) : processing ? (
          <div className="auth-form auth-form--center">
            <div className="auth-callback-loading"><BrandLogo size={34} /></div>
            <div className="auth-head">
              <h1>Confirmando sua conta...</h1>
              <p>Estamos validando o link e preparando o MyFitTrack.</p>
            </div>
            <button className="auth-link" onClick={() => navigate('/', { replace: true })}>Voltar para entrar</button>
          </div>
        ) : (
          <div className="auth-form auth-form--center">
            <div className="auth-success-icon">✓</div>
            <div className="auth-head">
              <h1>Confirmação concluída</h1>
              <p>Seu e-mail foi processado. Entre para continuar no MyFitTrack.</p>
            </div>
            <button className="auth-btn" onClick={() => navigate('/', { replace: true })}>IR PARA O LOGIN</button>
          </div>
        )}
      </div>
    </div>
  );
}
