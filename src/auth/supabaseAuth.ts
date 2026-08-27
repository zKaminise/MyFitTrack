// Provider de autenticacao via Supabase (usado quando VITE_SUPABASE_* existe).
import { supabase } from '@/lib/supabase';
import { AuthError, type AuthProvider, type AuthUser, type SignUpResult } from './types';
import type { User } from '@supabase/supabase-js';
import { authCallbackUrl, googleOAuthOptions, resetPasswordUrl } from './redirects';

function client() {
  if (!supabase) throw new AuthError('unknown', 'Supabase nao configurado');
  return supabase;
}

function mapUser(u: User | null | undefined): AuthUser | null {
  if (!u) return null;
  const name = (u.user_metadata?.name as string | undefined) ?? u.email?.split('@')[0] ?? '';
  return { id: u.id, email: u.email ?? '', name };
}

function mapError(message: string): AuthError {
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return new AuthError('invalid_credentials');
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already'))
    return new AuthError('email_in_use');
  if (m.includes('password') && m.includes('6')) return new AuthError('weak_password');
  if (m.includes('email') && m.includes('valid')) return new AuthError('invalid_email');
  return new AuthError('unknown', message);
}

/** Garante uma linha em profiles com o nome do usuario. */
async function upsertProfile(user: AuthUser | null) {
  if (!user) return;
  try {
    await client().from('profiles').upsert(
      { id: user.id, name: user.name, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    );
  } catch {
    // profiles pode nao existir ainda; nao bloquear login.
  }
}

export const supabaseAuthProvider: AuthProvider = {
  mode: 'supabase',
  supportsGoogle: true,

  async getCurrentUser() {
    const { data } = await client().auth.getSession();
    const user = mapUser(data.session?.user);
    await upsertProfile(user);
    return user;
  },

  async signUp(name, email, password): Promise<SignUpResult> {
    const { data, error } = await client().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: authCallbackUrl() },
    });
    if (error) throw mapError(error.message);
    const user = mapUser(data.user);
    // Sem sessao => confirmacao de e-mail habilitada.
    if (!data.session) return { user, needsEmailConfirm: true };
    await upsertProfile(user);
    return { user, needsEmailConfirm: false };
  },

  async signIn(email, password) {
    const { data, error } = await client().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw mapError(error.message);
    const user = mapUser(data.user)!;
    await upsertProfile(user);
    return user;
  },

  async signInWithGoogle() {
    const { error } = await client().auth.signInWithOAuth({
      provider: 'google',
      options: googleOAuthOptions(),
    });
    if (error) throw new AuthError('google_unavailable', error.message);
  },

  async signOut() {
    await client().auth.signOut();
  },

  async resetPassword(email) {
    const { error } = await client().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: resetPasswordUrl(),
    });
    if (error) throw mapError(error.message);
  },

  async resendConfirmation(email) {
    const { error } = await client().auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: authCallbackUrl() },
    });
    if (error) throw mapError(error.message);
  },

  async updateName(name) {
    const { data, error } = await client().auth.updateUser({ data: { name: name.trim() } });
    if (error) throw mapError(error.message);
    const user = mapUser(data.user)!;
    await upsertProfile(user);
    return user;
  },

  async changePassword(_current, next) {
    // Supabase nao exige a senha atual para o usuario autenticado.
    if (next.length < 6) throw new AuthError('weak_password');
    const { error } = await client().auth.updateUser({ password: next });
    if (error) throw mapError(error.message);
  },

  async deleteAccount() {
    // Exclusao do usuario Auth exige service role -> Edge Function 'delete-account'.
    const { error } = await client().functions.invoke('delete-account');
    if (error) throw new AuthError('delete_needs_backend');
    await client().auth.signOut();
  },

  onChange(cb) {
    const { data } = client().auth.onAuthStateChange((_event, session) => {
      cb(mapUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  },
};
