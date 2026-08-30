-- Alimentacao: configuracao e slots em um agregado, alimentos privados,
-- refeicoes salvas e snapshots diarios imutaveis/local-first.
create table if not exists public.nutrition_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_foods (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists user_foods_user_idx on public.user_foods (user_id, updated_at);

create table if not exists public.saved_meals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists saved_meals_user_idx on public.saved_meals (user_id, updated_at);

create table if not exists public.nutrition_days (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, date)
);
create index if not exists nutrition_days_user_date_idx on public.nutrition_days (user_id, date);

alter table public.nutrition_settings enable row level security;
alter table public.user_foods enable row level security;
alter table public.saved_meals enable row level security;
alter table public.nutrition_days enable row level security;

revoke all on table public.nutrition_settings, public.user_foods,
  public.saved_meals, public.nutrition_days from anon, authenticated;
grant select, insert, update, delete on table public.nutrition_settings,
  public.user_foods, public.saved_meals, public.nutrition_days to authenticated;

create policy nutrition_settings_own on public.nutrition_settings
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy user_foods_own on public.user_foods
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy saved_meals_own on public.saved_meals
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy nutrition_days_own on public.nutrition_days
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger user_foods_prevent_stale before update on public.user_foods
  for each row execute function public.myfittrack_prevent_stale_update();
create trigger nutrition_settings_prevent_stale before update on public.nutrition_settings
  for each row execute function public.myfittrack_prevent_stale_update();
create trigger saved_meals_prevent_stale before update on public.saved_meals
  for each row execute function public.myfittrack_prevent_stale_update();
create trigger nutrition_days_prevent_stale before update on public.nutrition_days
  for each row execute function public.myfittrack_prevent_stale_update();
