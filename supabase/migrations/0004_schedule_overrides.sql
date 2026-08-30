-- Overrides manuais por data. A programacao base permanece intacta.
create table if not exists public.schedule_overrides (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  date date not null,
  type text not null check (type in ('replace', 'swap', 'rest')),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, program_id, date)
);
create index if not exists schedule_overrides_user_date_idx
  on public.schedule_overrides (user_id, date);

alter table public.schedule_overrides enable row level security;
revoke all on table public.schedule_overrides from anon, authenticated;
grant select, insert, update, delete on table public.schedule_overrides to authenticated;

create policy schedule_overrides_select_own on public.schedule_overrides
  for select to authenticated using ((select auth.uid()) = user_id);
create policy schedule_overrides_insert_own on public.schedule_overrides
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy schedule_overrides_update_own on public.schedule_overrides
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy schedule_overrides_delete_own on public.schedule_overrides
  for delete to authenticated using ((select auth.uid()) = user_id);

create trigger schedule_overrides_prevent_stale
  before update on public.schedule_overrides
  for each row execute function public.myfittrack_prevent_stale_update();
