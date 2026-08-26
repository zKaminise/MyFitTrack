-- MyFitTrack — schema inicial multiusuario.
-- Estrategia: cada agregado do dominio e uma linha com o objeto completo em
-- `data` (jsonb) + colunas de topo para indexacao/consulta. A biblioteca oficial
-- de exercicios NAO fica na nuvem (permanece local/global no app).

-- Perfil basico (nome). O e-mail vive no auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  archived boolean not null default false,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists workouts_user_idx on public.workouts (user_id, updated_at);

create table if not exists public.programs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  active boolean not null default false,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists programs_user_idx on public.programs (user_id, updated_at);

create table if not exists public.periodizations (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists periodizations_user_idx on public.periodizations (user_id, updated_at);

create table if not exists public.workout_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_id uuid,
  date date,
  status text,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists sessions_user_idx on public.workout_sessions (user_id, updated_at);
create index if not exists sessions_user_date_idx on public.workout_sessions (user_id, date);

create table if not exists public.personal_records (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text,
  type text,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists prs_user_idx on public.personal_records (user_id, updated_at);

create table if not exists public.custom_exercises (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists custom_ex_user_idx on public.custom_exercises (user_id, updated_at);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cria automaticamente um profile ao registrar um usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
