// Stores globais para toast e confirmacao imperativa.
import { create } from 'zustand';

interface ToastState {
  message: string | null;
  variant: 'default' | 'pr';
  show: (message: string, variant?: 'default' | 'pr') => void;
  hide: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useToast = create<ToastState>((set) => ({
  message: null,
  variant: 'default',
  show: (message, variant = 'default') => {
    set({ message, variant });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ message: null }), 2600);
  },
  hide: () => set({ message: null }),
}));

export function toast(message: string, variant: 'default' | 'pr' = 'default') {
  useToast.getState().show(message, variant);
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((v: boolean) => void) | null;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  answer: (v: boolean) => void;
}

export const useConfirm = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, options, resolve });
    }),
  answer: (v) => {
    const { resolve } = get();
    resolve?.(v);
    set({ open: false, options: null, resolve: null });
  },
}));

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return useConfirm.getState().ask(options);
}

/** Vibracao curta (respeitando disponibilidade). */
export function vibrate(pattern: number | number[], enabled: boolean) {
  if (!enabled) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}
