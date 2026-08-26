// Timer de descanso global. Continua rodando em segundo plano enquanto o
// usuario navega dentro da sessao (consultar exercicio, registrar etc.).
import { create } from 'zustand';

interface RestTimerState {
  running: boolean;
  total: number;
  endAt: number | null; // timestamp ms
  secondsLeft: number;
  start: (seconds: number) => void;
  add: (delta: number) => void;
  skip: () => void;
  tick: () => void;
}

export const useRestTimer = create<RestTimerState>((set, get) => ({
  running: false,
  total: 0,
  endAt: null,
  secondsLeft: 0,
  start: (seconds) => {
    if (seconds <= 0) return;
    set({ running: true, total: seconds, endAt: Date.now() + seconds * 1000, secondsLeft: seconds });
  },
  add: (delta) => {
    const { endAt, total, running } = get();
    if (!running || endAt == null) return;
    const newEnd = Math.max(Date.now(), endAt + delta * 1000);
    const left = Math.ceil((newEnd - Date.now()) / 1000);
    set({ endAt: newEnd, secondsLeft: left, total: Math.max(total, left) });
  },
  skip: () => set({ running: false, endAt: null, secondsLeft: 0 }),
  tick: () => {
    const { endAt, running } = get();
    if (!running || endAt == null) return;
    const left = Math.ceil((endAt - Date.now()) / 1000);
    if (left <= 0) {
      set({ running: false, endAt: null, secondsLeft: 0 });
    } else {
      set({ secondsLeft: left });
    }
  },
}));
