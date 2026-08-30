import { type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { SyncIndicator } from './SyncIndicator';
import { useAuth } from '@/store/authStore';

const TABS = [
  { to: '/', label: 'Hoje', icon: '🏋️' },
  { to: '/workouts', label: 'Treinos', icon: '📋' },
  { to: '/nutrition', label: 'Dieta', icon: '🥗' },
  { to: '/history', label: 'Historico', icon: '📈' },
  { to: '/more', label: 'Mais', icon: '⚙️' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const focusMode = location.pathname === '/session';

  return (
    <div className="app-shell">
      {!focusMode && (
        <aside className="sidebar">
          <div className="brand">
            <BrandLogo size={28} /> MyFitTrack
          </div>
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-ico">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
          <div className="sidebar-foot">
            <button
              className="grow"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'none', color: 'var(--text-dim)', width: '100%', fontWeight: 600 }}
              onClick={() => nav('/account')}
            >
              <span className="nav-ico">👤</span>
              <span className="grow" style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Conta'}</span>
            </button>
            <div style={{ padding: '8px 14px' }}>
              <SyncIndicator />
            </div>
          </div>
        </aside>
      )}

      <main className="app-main">{children}</main>

      {!focusMode && (
        <nav className="bottom-nav">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-ico">{t.icon}</span>
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
