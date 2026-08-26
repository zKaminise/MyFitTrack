import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';

// Mock de localStorage (nao existe no ambiente node do vitest).
class MemStorage {
  store = new Map<string, string>();
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, String(v));
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}
(globalThis as any).localStorage = new MemStorage();

import { localAuthProvider } from '@/auth/localAuth';
import { AuthError } from '@/auth/types';
import { db } from '@/db/database';

beforeEach(async () => {
  await db.users.clear();
  (globalThis.localStorage as unknown as MemStorage).clear();
});

describe('autenticacao local', () => {
  it('cadastra e mantem sessao', async () => {
    const { user } = await localAuthProvider.signUp('Gabriel', 'gab@example.com', 'senha123');
    expect(user?.name).toBe('Gabriel');
    const current = await localAuthProvider.getCurrentUser();
    expect(current?.id).toBe(user?.id);
  });

  it('rejeita e-mail duplicado', async () => {
    await localAuthProvider.signUp('A', 'dup@example.com', 'senha123');
    await expect(localAuthProvider.signUp('B', 'dup@example.com', 'senha123')).rejects.toMatchObject({
      code: 'email_in_use',
    });
  });

  it('rejeita senha incorreta', async () => {
    await localAuthProvider.signUp('A', 'a@example.com', 'senha123');
    await localAuthProvider.signOut();
    await expect(localAuthProvider.signIn('a@example.com', 'errada')).rejects.toBeInstanceOf(AuthError);
  });

  it('login apos logout restaura o usuario', async () => {
    await localAuthProvider.signUp('A', 'a@example.com', 'senha123');
    await localAuthProvider.signOut();
    expect(await localAuthProvider.getCurrentUser()).toBeNull();
    const u = await localAuthProvider.signIn('a@example.com', 'senha123');
    expect(u.email).toBe('a@example.com');
  });

  it('contas diferentes possuem ids diferentes', async () => {
    const a = await localAuthProvider.signUp('A', 'a@example.com', 'senha123');
    await localAuthProvider.signOut();
    const b = await localAuthProvider.signUp('B', 'b@example.com', 'senha123');
    expect(a.user?.id).not.toBe(b.user?.id);
  });
});
