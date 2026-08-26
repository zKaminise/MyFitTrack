import { useEffect, useState } from 'react';
import { workoutMediaUrls, countCached, prepareMedia, clearMediaCache } from '@/services/offlineMedia';
import { confirmAction, toast } from '@/ui/feedback';

export function OfflineMediaCard() {
  const [urls, setUrls] = useState<string[]>([]);
  const [cached, setCached] = useState(0);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const u = await workoutMediaUrls();
    setUrls(u);
    setCached(await countCached(u));
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function prepare() {
    if (urls.length === 0) {
      toast('Nenhuma midia nos seus treinos');
      return;
    }
    setProgress({ done: 0, total: urls.length });
    const result = await prepareMedia(urls, (p) => setProgress(p));
    setProgress(null);
    await refresh();
    if (result.failed > 0) toast(`${result.cached} prontas, ${result.failed} falharam`);
    else toast('✓ Midias dos seus treinos disponiveis offline');
  }

  async function clear() {
    const ok = await confirmAction({ title: 'Limpar cache de midia?', message: 'As imagens serao baixadas novamente quando visualizadas.', danger: true, confirmLabel: 'Limpar cache' });
    if (!ok) return;
    await clearMediaCache();
    await refresh();
    toast('Cache de midia limpo');
  }

  const remaining = urls.length - cached;

  return (
    <div className="card stack">
      <div className="row-between">
        <div>
          <strong>Midia offline</strong>
          <div className="muted" style={{ fontSize: 13 }}>
            {loading
              ? 'Verificando...'
              : `${urls.length} midias · ${cached} disponiveis offline${remaining > 0 ? ` · ${remaining} pendentes` : ''}`}
          </div>
        </div>
        <span style={{ fontSize: 22 }}>{remaining === 0 && urls.length > 0 ? '✓' : '📥'}</span>
      </div>

      {progress && (
        <div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Baixando {progress.done}/{progress.total}...</div>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--card-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(progress.done / progress.total) * 100}%`, background: 'var(--accent)', transition: 'width .2s' }} />
          </div>
        </div>
      )}

      <button className="btn btn--primary btn--block" onClick={prepare} disabled={!!progress || (urls.length > 0 && remaining === 0)}>
        {urls.length > 0 && remaining === 0 ? 'Tudo disponivel offline' : 'Preparar meus treinos para uso offline'}
      </button>
      {cached > 0 && (
        <button className="btn btn--block btn--ghost" onClick={clear} disabled={!!progress}>Limpar cache de midia</button>
      )}
    </div>
  );
}
