import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('seguranca Supabase', () => {
  it('RLS revoga anon e restringe policies ao authenticated', () => {
    const sql = read('supabase/migrations/0002_rls.sql');
    expect(sql).toContain('revoke all on table');
    expect(sql).toContain('from anon, authenticated');
    expect(sql).toContain('to authenticated');
    expect(sql).toContain('(select auth.uid()) = user_id');
  });

  it('todas as tabelas privadas possuem policies por operacao', () => {
    const sql = read('supabase/migrations/0002_rls.sql');
    for (const prefix of ['workouts', 'programs', 'periodizations', 'sessions', 'prs', 'custom_ex', 'settings']) {
      expect(sql).toContain(`${prefix}_select_own`);
      expect(sql).toContain(`${prefix}_insert_own`);
      expect(sql).toContain(`${prefix}_update_own`);
      expect(sql).toContain(`${prefix}_delete_own`);
    }
  });

  it('integridade de sync impede regressao de updated_at', () => {
    const sql = read('supabase/migrations/0003_sync_integrity.sql');
    expect(sql).toContain('new.updated_at < old.updated_at');
    expect(sql).toContain('sessions_prevent_stale');
  });

  it('delete-account deriva o usuario do JWT e nao aceita userId do body', () => {
    const source = read('supabase/functions/delete-account/index.ts');
    expect(source).toContain('admin.auth.getUser(jwt)');
    expect(source).toContain('admin.auth.admin.deleteUser(userData.user.id)');
    expect(source).not.toContain('req.json()');
  });

  it('catalogo comunitario permite leitura e restringe escrita ao autor', () => {
    const sql = read('supabase/migrations/0006_set_prescriptions_and_community_exercises.sql');
    expect(sql).toContain('community_exercises_read');
    expect(sql).toContain('(select auth.uid()) = author_id');
    expect(sql).toContain("(storage.foldername(name))[1] = (select auth.uid())::text");
    expect(sql).toContain("bucket_id = 'exercise-media'");
  });
});
