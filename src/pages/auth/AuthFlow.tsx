import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/store/authStore';
import { auth, authErrorMessage } from '@/auth';
import { BrandLogo } from '@/components/BrandLogo';

type View = 'login' | 'signup' | 'forgot';

export default function AuthFlow() {
  const [view, setView] = useState<View>('login');
  const mode = useAuth((s) => s.mode);
  return (
    <div className="auth-wrap">
      {mode === 'local' && <div className="auth-badge">Modo local · sem nuvem configurada</div>}
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo"><BrandLogo size={34} /></div>
          <span>MyFitTrack</span>
        </div>
        {view === 'login' && <LoginForm onView={setView} />}
        {view === 'signup' && <SignupForm onView={setView} />}
        {view === 'forgot' && <ForgotForm onView={setView} />}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="auth-field">
      <label>
        <span>{label}</span>
        {children}
      </label>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="auth-error">
      <span>⚠</span>
      <span>{msg}</span>
    </div>
  );
}

function GoogleButton() {
  const { supportsGoogle, signInWithGoogle } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  if (!supportsGoogle) return null;
  return (
    <>
      <div className="auth-divider">ou</div>
      <button
        type="button"
        className="auth-btn auth-btn--google"
        onClick={async () => {
          try {
            await signInWithGoogle();
          } catch (e) {
            setErr(authErrorMessage(e));
          }
        }}
      >
        <span style={{ fontWeight: 700 }}>G</span> Continuar com Google
      </button>
      {err && <ErrorBox msg={err} />}
    </>
  );
}

function LoginForm({ onView }: { onView: (v: View) => void }) {
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setErr(authErrorMessage(e));
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-head">
        <h1>
          Seu treino. <span className="grad">Sua evolução.</span>
        </h1>
        <p>Entre para continuar acompanhando seus treinos e sua progressão.</p>
      </div>
      <ErrorBox msg={err} />
      <Field label="E-mail">
        <input className="auth-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Senha">
        <input className="auth-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <button className="auth-btn" type="submit" disabled={loading}>
        {loading ? <span className="spinner" /> : 'ENTRAR'}
      </button>
      <button type="button" className="auth-link" style={{ alignSelf: 'center' }} onClick={() => onView('forgot')}>
        Esqueceu sua senha?
      </button>
      <GoogleButton />
      <p className="auth-foot">
        Ainda não possui uma conta?{' '}
        <button type="button" className="auth-link" onClick={() => onView('signup')}>
          Criar conta
        </button>
      </p>
    </form>
  );
}

function SignupForm({ onView }: { onView: (v: View) => void }) {
  const signUp = useAuth((s) => s.signUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) {
      setErr('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const { needsEmailConfirm } = await signUp(name, email, password);
      if (needsEmailConfirm) {
        setConfirmSent(true);
        setLoading(false);
      }
    } catch (e) {
      setErr(authErrorMessage(e));
      setLoading(false);
    }
  }

  if (confirmSent) {
    return (
      <div className="auth-form auth-form--center">
        <div style={{ fontSize: 44 }}>📧</div>
        <div className="auth-head">
          <h1>Verifique seu e-mail</h1>
          <p>Enviamos um link de confirmação para {email}. Confirme para acessar sua conta.</p>
        </div>
        <button
          className="auth-btn"
          onClick={async () => {
            try {
              await auth.resendConfirmation(email);
              setErr(null);
            } catch (e) {
              setErr(authErrorMessage(e));
            }
          }}
        >
          Reenviar e-mail
        </button>
        <ErrorBox msg={err} />
        <button className="auth-link" onClick={() => onView('login')}>Voltar para entrar</button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-head">
        <h1>Crie sua conta</h1>
        <p>Comece a acompanhar seus treinos e sua evolução.</p>
      </div>
      <ErrorBox msg={err} />
      <Field label="Nome">
        <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="E-mail">
        <input className="auth-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Senha">
        <input className="auth-input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <Field label="Confirmar senha">
        <input className={`auth-input ${confirm && confirm !== password ? 'invalid' : ''}`} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </Field>
      <button className="auth-btn" type="submit" disabled={loading}>
        {loading ? <span className="spinner" /> : 'CRIAR CONTA'}
      </button>
      <GoogleButton />
      <p className="auth-foot">
        Já possui conta?{' '}
        <button type="button" className="auth-link" onClick={() => onView('login')}>
          Entrar
        </button>
      </p>
    </form>
  );
}

function ForgotForm({ onView }: { onView: (v: View) => void }) {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await auth.resetPassword(email);
      setSent(true);
    } catch (e) {
      setErr(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-form auth-form--center">
        <div style={{ fontSize: 44 }}>✉️</div>
        <div className="auth-head">
          <h1>Verifique seu e-mail</h1>
          <p>Se existir uma conta para {email}, enviamos um link para redefinir a senha.</p>
        </div>
        <button className="auth-btn" onClick={() => onView('login')}>Voltar para entrar</button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-head">
        <h1>Recuperar senha</h1>
        <p>Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>
      </div>
      <ErrorBox msg={err} />
      <Field label="E-mail">
        <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <button className="auth-btn" type="submit" disabled={loading}>
        {loading ? <span className="spinner" /> : 'Enviar link'}
      </button>
      <p className="auth-foot">
        <button type="button" className="auth-link" onClick={() => onView('login')}>
          Voltar para entrar
        </button>
      </p>
    </form>
  );
}
