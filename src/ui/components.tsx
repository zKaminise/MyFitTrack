// Componentes de UI compartilhados: Sheet, Toast host, Confirm host.
import { type ReactNode, useEffect } from 'react';
import { useToast, useConfirm } from './feedback';

export function Sheet({
  open,
  onClose,
  title,
  children,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {title && (
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 20 }}>{title}</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function ToastHost() {
  const { message, variant } = useToast();
  if (!message) return null;
  return <div className={`toast ${variant === 'pr' ? 'pr-flash' : ''}`}>{message}</div>;
}

export function ConfirmHost() {
  const { open, options, answer } = useConfirm();
  if (!open || !options) return null;
  return (
    <div className="sheet-backdrop" onClick={() => answer(false)}>
      <div className="sheet" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>{options.title}</h3>
        {options.message && <p className="muted" style={{ marginTop: 0 }}>{options.message}</p>}
        <div className="stack-sm" style={{ marginTop: 16 }}>
          <button
            className={`btn btn--block ${options.danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => answer(true)}
          >
            {options.confirmLabel ?? 'Confirmar'}
          </button>
          <button className="btn btn--block btn--ghost" onClick={() => answer(false)}>
            {options.cancelLabel ?? 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}
