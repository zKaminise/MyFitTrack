-- MyFitTrack — isolamento multiusuario no banco.
-- O cliente usa somente a publishable key. O papel anon nao recebe acesso aos
-- dados pessoais e authenticated so opera linhas autorizadas pelas policies.

alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.programs enable row level security;
alter table public.periodizations enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.personal_records enable row level security;
alter table public.custom_exercises enable row level security;
alter table public.user_settings enable row level security;

revoke all on table public.profiles, public.workouts, public.programs,
  public.periodizations, public.workout_sessions, public.personal_records,
  public.custom_exercises, public.user_settings from anon, authenticated;

grant select, insert, update, delete on table public.profiles, public.workouts,
  public.programs, public.periodizations, public.workout_sessions,
  public.personal_records, public.custom_exercises, public.user_settings
  to authenticated;

-- Profiles.
drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_delete_self on public.profiles;
create policy profiles_select_self on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_self on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_self on public.profiles for delete to authenticated using ((select auth.uid()) = id);

-- Workouts.
drop policy if exists workouts_select_own on public.workouts;
drop policy if exists workouts_insert_own on public.workouts;
drop policy if exists workouts_update_own on public.workouts;
drop policy if exists workouts_delete_own on public.workouts;
create policy workouts_select_own on public.workouts for select to authenticated using ((select auth.uid()) = user_id);
create policy workouts_insert_own on public.workouts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy workouts_update_own on public.workouts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy workouts_delete_own on public.workouts for delete to authenticated using ((select auth.uid()) = user_id);

-- Programs.
drop policy if exists programs_select_own on public.programs;
drop policy if exists programs_insert_own on public.programs;
drop policy if exists programs_update_own on public.programs;
drop policy if exists programs_delete_own on public.programs;
create policy programs_select_own on public.programs for select to authenticated using ((select auth.uid()) = user_id);
create policy programs_insert_own on public.programs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy programs_update_own on public.programs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy programs_delete_own on public.programs for delete to authenticated using ((select auth.uid()) = user_id);

-- Periodizations.
drop policy if exists periodizations_select_own on public.periodizations;
drop policy if exists periodizations_insert_own on public.periodizations;
drop policy if exists periodizations_update_own on public.periodizations;
drop policy if exists periodizations_delete_own on public.periodizations;
create policy periodizations_select_own on public.periodizations for select to authenticated using ((select auth.uid()) = user_id);
create policy periodizations_insert_own on public.periodizations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy periodizations_update_own on public.periodizations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy periodizations_delete_own on public.periodizations for delete to authenticated using ((select auth.uid()) = user_id);

-- Workout sessions (sets e snapshots vivem dentro de data).
drop policy if exists sessions_select_own on public.workout_sessions;
drop policy if exists sessions_insert_own on public.workout_sessions;
drop policy if exists sessions_update_own on public.workout_sessions;
drop policy if exists sessions_delete_own on public.workout_sessions;
create policy sessions_select_own on public.workout_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy sessions_insert_own on public.workout_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy sessions_update_own on public.workout_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy sessions_delete_own on public.workout_sessions for delete to authenticated using ((select auth.uid()) = user_id);

-- Personal records.
drop policy if exists prs_select_own on public.personal_records;
drop policy if exists prs_insert_own on public.personal_records;
drop policy if exists prs_update_own on public.personal_records;
drop policy if exists prs_delete_own on public.personal_records;
create policy prs_select_own on public.personal_records for select to authenticated using ((select auth.uid()) = user_id);
create policy prs_insert_own on public.personal_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy prs_update_own on public.personal_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy prs_delete_own on public.personal_records for delete to authenticated using ((select auth.uid()) = user_id);

-- Custom exercises.
drop policy if exists custom_ex_select_own on public.custom_exercises;
drop policy if exists custom_ex_insert_own on public.custom_exercises;
drop policy if exists custom_ex_update_own on public.custom_exercises;
drop policy if exists custom_ex_delete_own on public.custom_exercises;
create policy custom_ex_select_own on public.custom_exercises for select to authenticated using ((select auth.uid()) = user_id);
create policy custom_ex_insert_own on public.custom_exercises for insert to authenticated with check ((select auth.uid()) = user_id);
create policy custom_ex_update_own on public.custom_exercises for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy custom_ex_delete_own on public.custom_exercises for delete to authenticated using ((select auth.uid()) = user_id);

-- User settings e favoritos.
drop policy if exists settings_select_own on public.user_settings;
drop policy if exists settings_insert_own on public.user_settings;
drop policy if exists settings_update_own on public.user_settings;
drop policy if exists settings_delete_own on public.user_settings;
create policy settings_select_own on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy settings_insert_own on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy settings_update_own on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy settings_delete_own on public.user_settings for delete to authenticated using ((select auth.uid()) = user_id);
