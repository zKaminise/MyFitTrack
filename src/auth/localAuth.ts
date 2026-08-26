// Provider de autenticacao LOCAL (sem Supabase). Contas ficam no IndexedDB deste
// dispositivo; funciona 100% offline. Sem sincronizacao entre dispositivos
// (isso requer o Supabase). Serve como fallback e para desenvolvimento/testes.
import { db } from '@/db/database';
import { uuid, nowISO } from '@/lib/id';
import { hashPassword, verifyPassword } from './crypto';
import { AuthError, type AuthProvider, type AuthUser, type SignUpResult } from './types';
import type { LocalUser } from '@/domain/types';

const SESSION_KEY = 'fs2.local.session';

type Listener = (user: AuthUser | null) => void;
const listeners = new Set<Listener>();
function emit(user: AuthUser | null) {
  for (const l of listeners) l(user);
}

function toAuthUser(u: LocalUser): AuthUser {
  return { id: u.id, email: u.email, name: u.name };
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function currentLocalUser(): Promise<LocalUser | null> {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return (await db.users.get(id)) ?? null;
}

export const localAuthProvider: AuthProvider = {
  mode: 'local',
  supportsGoogle: false,

  async getCurrentUser() {
    const u = await currentLocalUser();
    return u ? toAuthUser(u) : null;
  },

  async signUp(name, email, password): Promise<SignUpResult> {
    const e = email.trim().toLowerCase();
    if (!validEmail(e)) throw new AuthError('invalid_email');
    if (password.length < 6) throw new AuthError('weak_password');
    const existing = await db.users.where('email').equals(e).first();
    if (existing) throw new AuthError('email_in_use');
    const { hash, salt } = await hashPassword(password);
    const user: LocalUser = {
      id: uuid(),
      email: e,
      name: name.trim() || e.split('@')[0],
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: nowISO(),
    };
    await db.users.add(user);
    localStorage.setItem(SESSION_KEY, user.id);
    const au = toAuthUser(user);
    emit(au);
    return { user: au, needsEmailConfirm: false };
  },

  async signIn(email, password) {
    const e = email.trim().toLowerCase();
    const user = await db.users.where('email').equals(e).first();
    if (!user) throw new AuthError('invalid_credentials');
    const ok = await verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!ok) throw new AuthError('invalid_credentials');
    localStorage.setItem(SESSION_KEY, user.id);
    const au = toAuthUser(user);
    emit(au);
    return au;
  },

  async signInWithGoogle() {
    throw new AuthError('google_unavailable');
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    emit(null);
  },

  async resetPassword() {
    throw new AuthError('reset_unavailable_local');
  },

  async resendConfirmation() {
    throw new AuthError('reset_unavailable_local');
  },

  async updateName(name) {
    const u = await currentLocalUser();
    if (!u) throw new AuthError('user_not_found');
    const next = { ...u, name: name.trim() };
    await db.users.put(next);
    const au = toAuthUser(next);
    emit(au);
    return au;
  },

  async changePassword(current, next) {
    const u = await currentLocalUser();
    if (!u) throw new AuthError('user_not_found');
    const ok = await verifyPassword(current, u.passwordHash, u.passwordSalt);
    if (!ok) throw new AuthError('invalid_credentials');
    if (next.length < 6) throw new AuthError('weak_password');
    const { hash, salt } = await hashPassword(next);
    await db.users.put({ ...u, passwordHash: hash, passwordSalt: salt });
  },

  async deleteAccount() {
    const u = await currentLocalUser();
    if (!u) throw new AuthError('user_not_found');
    await deleteLocalUserData(u.id);
    await db.users.delete(u.id);
    localStorage.removeItem(SESSION_KEY);
    emit(null);
  },

  onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

/** Remove todos os dados locais pertencentes a um usuario. */
export async function deleteLocalUserData(userId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.workouts, db.programs, db.periodizations, db.sessions, db.personalRecords, db.settings, db.exercises, db.backups, db.syncQueue, db.syncMeta],
    async () => {
      await db.workouts.where('userId').equals(userId).delete();
      await db.programs.where('userId').equals(userId).delete();
      await db.periodizations.where('userId').equals(userId).delete();
      await db.sessions.where('userId').equals(userId).delete();
      await db.personalRecords.where('userId').equals(userId).delete();
      await db.exercises.where('userId').equals(userId).delete(); // apenas custom
      await db.backups.where('userId').equals(userId).delete();
      await db.syncQueue.where('userId').equals(userId).delete();
      await db.settings.delete(userId);
      await db.syncMeta.delete(userId);
    },
  );
}
