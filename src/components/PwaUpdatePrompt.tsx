import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

/** Mantém instalações PWA atualizadas sem trocar a versão durante uma série. */
export function PwaUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_serviceWorkerUrl, currentRegistration) {
      setRegistration(currentRegistration);
    },
  });

  useEffect(() => {
    if (!registration) return;

    const checkForUpdate = () => {
      if (navigator.onLine) void registration.update();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    const interval = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
    window.addEventListener('online', checkForUpdate);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', checkForUpdate);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [registration]);

  if (!offlineReady && !needRefresh) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <aside className="pwa-update" role="status" aria-live="polite">
      <span className="pwa-update__icon" aria-hidden>{needRefresh ? '↻' : '✓'}</span>
      <div className="pwa-update__copy">
        <strong>{needRefresh ? 'Nova versão disponível' : 'Pronto para usar offline'}</strong>
        <span>
          {needRefresh
            ? 'Atualize para receber as correções mais recentes do MyFitTrack.'
            : 'O aplicativo e seus treinos podem ser abertos sem internet.'}
        </span>
      </div>
      <div className="pwa-update__actions">
        {needRefresh && (
          <button className="btn btn--primary btn--sm" onClick={() => void updateServiceWorker(true)}>
            Atualizar agora
          </button>
        )}
        <button className="pwa-update__close" onClick={close} aria-label="Fechar aviso">✕</button>
      </div>
    </aside>
  );
}
