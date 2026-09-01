-- Prescricoes por serie vivem dentro do JSON dos workouts/sessions, portanto
-- nao exigem nova tabela. Esta migration adiciona somente o catalogo autoral
-- compartilhado e o Storage das demonstracoes publicadas.
create table if not exists public.community_exercises (
  id uuid primary key,
  author_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  primary_muscle text not null,
  published boolean not null default true,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists community_exercises_updated_idx on public.community_exercises (updated_at);
create index if not exists community_exercises_author_idx on public.community_exercises (author_id, updated_at);

alter table public.community_exercises enable row level security;
revoke all on table public.community_exercises from anon, authenticated;
grant select, insert, update, delete on table public.community_exercises to authenticated;

create policy community_exercises_read on public.community_exercises
  for select to authenticated using (published = true or deleted_at is not null or (select auth.uid()) = author_id);
create policy community_exercises_insert on public.community_exercises
  for insert to authenticated with check ((select auth.uid()) = author_id);
create policy community_exercises_update on public.community_exercises
  for update to authenticated using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);
create policy community_exercises_delete on public.community_exercises
  for delete to authenticated using ((select auth.uid()) = author_id);

create trigger community_exercises_prevent_stale before update on public.community_exercises
  for each row execute function public.myfittrack_prevent_stale_update();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, 15728640,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy exercise_media_public_read on storage.objects
  for select using (bucket_id = 'exercise-media');
create policy exercise_media_owner_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy exercise_media_owner_update on storage.objects
  for update to authenticated using (
    bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy exercise_media_owner_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
