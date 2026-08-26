import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/authStore';
import { SyncIndicator } from '@/components/SyncIndicator';

const ITEMS = [
  { to: '/exercises', icon: '💪', title: 'Exercicios', sub: 'Biblioteca e meus exercicios' },
  { to: '/program', icon: '🗓️', title: 'Programa', sub: 'Dias fixos, ciclo e pausa' },
  { to: '/periodization', icon: '📐', title: 'Periodizacao', sub: 'Semanas, deload e intensidade' },
  { to: '/settings', icon: '⚙️', title: 'Configuracoes', sub: 'Aparencia, unidade, progressao' },
  { to: '/backup', icon: '💾', title: 'Backup', sub: 'Exportar, importar e snapshots' },
];

export default function MorePage() {
  const nav = useNavigate();
  const user = useAuth((s) => s.user);

  return (
    <div className="screen">
      <div className="row-between">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Mais</h1>
        <SyncIndicator />
      </div>

      <button className="card card-tap" style={{ textAlign: 'left', margin: '16px 0 4px' }} onClick={() => nav('/account')}>
        <div className="row" style={{ gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>
            {(user?.name?.[0] ?? '?').toUpperCase()}
          </span>
          <div className="grow">
            <div className="li-title">{user?.name ?? 'Minha conta'}</div>
            <div className="li-sub">{user?.email}</div>
          </div>
          <span className="faint">›</span>
        </div>
      </button>

      <div className="stack-sm" style={{ marginTop: 12 }}>
        {ITEMS.map((it) => (
          <button key={it.to} className="list-item card-tap" onClick={() => nav(it.to)}>
            <span style={{ fontSize: 22 }}>{it.icon}</span>
            <div className="grow">
              <div className="li-title">{it.title}</div>
              <div className="li-sub">{it.sub}</div>
            </div>
            <span className="faint">›</span>
          </button>
        ))}
      </div>
      <p className="faint center" style={{ marginTop: 28, fontSize: 12 }}>
        MyFitTrack · local-first, offline e sincronizado · v1.0
      </p>
    </div>
  );
}
