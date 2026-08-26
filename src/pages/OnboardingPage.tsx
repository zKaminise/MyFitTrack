import { useNavigate } from 'react-router-dom';
import { loadDemoProgram } from '@/db/seed';
import { useSettings } from '@/store/settingsStore';
import { useAuth } from '@/store/authStore';
import { toast } from '@/ui/feedback';
import { BrandLogo } from '@/components/BrandLogo';

export default function OnboardingPage() {
  const nav = useNavigate();
  const { update } = useSettings();
  const user = useAuth((s) => s.user);
  const firstName = user?.name?.split(' ')[0];

  const createOwn = async () => {
    await update({ onboarded: true });
    nav('/workouts');
  };

  const loadDemo = async () => {
    if (!user) return;
    await loadDemoProgram(user.id);
    await useSettings.getState().load();
    toast('Programa de exemplo carregado');
    nav('/');
  };

  return (
    <div className="screen center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh' }}>
      <div className="onboarding-logo"><BrandLogo size={42} /></div>
      <h1 className="page-title" style={{ fontSize: 32 }}>
        {firstName ? `Vamos começar, ${firstName}` : 'Como deseja começar?'}
      </h1>
      <p className="muted" style={{ maxWidth: 380, margin: '0 auto 28px' }}>
        Organize seus treinos, registre sua evolução e saiba exatamente o que fazer a cada sessão.
      </p>
      <div className="stack" style={{ maxWidth: 380, margin: '0 auto', width: '100%' }}>
        <button className="card card-tap" style={{ textAlign: 'left' }} onClick={createOwn}>
          <div className="row" style={{ gap: 12 }}>
            <span style={{ fontSize: 26 }}>✏️</span>
            <div className="grow">
              <div className="li-title" style={{ fontSize: 17 }}>Criar meus treinos</div>
              <div className="li-sub">Começar do zero e montar seu programa.</div>
            </div>
            <span className="faint">›</span>
          </div>
        </button>
        <button className="card card-tap" style={{ textAlign: 'left' }} onClick={loadDemo}>
          <div className="row" style={{ gap: 12 }}>
            <span style={{ fontSize: 26 }}>⚡</span>
            <div className="grow">
              <div className="li-title" style={{ fontSize: 17 }}>Usar programa de exemplo</div>
              <div className="li-sub">Carregar Treino A/B/C com ciclo pronto.</div>
            </div>
            <span className="faint">›</span>
          </div>
        </button>
      </div>
    </div>
  );
}
