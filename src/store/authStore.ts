import { create } from 'zustand';
import { auth, type AuthUser } from '@/auth';
import { setCurrentUserId } from '@/repositories/context';
import { ensureSettings } from '@/db/seed';
import { useSettings } from './settingsStore';
import { useSession } from './sessionStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { initSync, fullPull, refreshPendingCount } from '@/sync/engine';
import { useSyncStatus } from '@/sync/status';
import { ensureNutritionSettings } from '@/services/nutritionService';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  mode: 'supabase' | 'local';
  supportsGoogle: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{ needsEmailConfirm: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

let subscribed = false;

async function applyUser(user: AuthUser | null): Promise<void> {
  setCurrentUserId(user?.id ?? null);
  if (!user) {
    useSettings.getState().clear();
    useSession.setState({ active: null, savedAt: null });
    useSyncStatus.getState().set({ pending: 0, state: isSupabaseConfigured ? 'idle' : 'local' });
    return;
  }
  await ensureSettings(user.id);
  await ensureNutritionSettings();
  await useSettings.getState().load();
  await useSession.getState().load();
  await refreshPendingCount();
  if (isSupabaseConfigured) {
    initSync();
    // Pull inicial em segundo plano; recarrega settings apos concluir.
    void fullPull(user.id).then(() => {
      void useSettings.getState().load();
      void useSession.getState().load();
    });
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  mode: auth.mode,
  supportsGoogle: auth.supportsGoogle,

  init: async () => {
    if (!subscribed) {
      subscribed = true;
      auth.onChange((user) => {
        // Reage a mudancas de sessao (ex: OAuth redirect, refresh).
        if (user?.id !== get().user?.id) {
          void applyUser(user).then(() => set({ user }));
        } else {
          set({ user });
        }
      });
    }
    const user = await auth.getCurrentUser();
    await applyUser(user);
    set({ user, loading: false });
  },

  signIn: async (email, password) => {
    const user = await auth.signIn(email, password);
    await applyUser(user);
    set({ user });
  },

  signUp: async (name, email, password) => {
    const result = await auth.signUp(name, email, password);
    if (result.user && !result.needsEmailConfirm) {
      await applyUser(result.user);
      set({ user: result.user });
    }
    return { needsEmailConfirm: result.needsEmailConfirm };
  },

  signInWithGoogle: async () => {
    await auth.signInWithGoogle();
    // Supabase redireciona; o retorno e tratado por onChange.
  },

  signOut: async () => {
    await auth.signOut();
    await applyUser(null);
    set({ user: null });
  },

  updateName: async (name) => {
    const user = await auth.updateName(name);
    set({ user });
  },

  refreshUser: async () => {
    const user = await auth.getCurrentUser();
    set({ user });
  },
}));

export function useCurrentUserId(): string | null {
  return useAuth((s) => s.user?.id ?? null);
}
