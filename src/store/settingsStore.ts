import { create } from 'zustand';
import type { Settings } from '@/domain/types';
import { settingsRepo } from '@/repositories/dexie';
import { defaultSettings } from '@/db/seed';
import { nowISO } from '@/lib/id';
import { getCurrentUserId } from '@/repositories/context';

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
  toggleFavorite: (exerciseId: string) => Promise<void>;
  clear: () => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: defaultSettings(''),
  loaded: false,
  load: async () => {
    const uid = getCurrentUserId();
    const s = (await settingsRepo.get()) ?? defaultSettings(uid ?? '');
    set({ settings: s, loaded: true });
    applyTheme(s.theme);
  },
  update: async (patch) => {
    const next: Settings = { ...get().settings, ...patch, updatedAt: nowISO() };
    set({ settings: next });
    await settingsRepo.save(next);
    if (patch.theme) applyTheme(next.theme);
  },
  toggleFavorite: async (exerciseId) => {
    const cur = get().settings.favoriteExerciseIds ?? [];
    const next = cur.includes(exerciseId)
      ? cur.filter((x) => x !== exerciseId)
      : [...cur, exerciseId];
    await get().update({ favoriteExerciseIds: next });
  },
  clear: () => {
    // Evita vazamento visual de dados da conta anterior ao trocar de usuario.
    set({ settings: defaultSettings(''), loaded: false });
    applyTheme('dark');
  },
}));

export function isFavorite(settings: Settings, exerciseId: string): boolean {
  return (settings.favoriteExerciseIds ?? []).includes(exerciseId);
}

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}
