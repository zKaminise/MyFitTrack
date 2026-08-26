-- MyFitTrack — integridade do merge Last-Write-Wins.
-- Um dispositivo com estado antigo nao pode reduzir updated_at nem sobrescrever
-- uma versao mais nova que ja chegou ao banco.
create or replace function public.myfittrack_prevent_stale_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists workouts_prevent_stale on public.workouts;
create trigger workouts_prevent_stale before update on public.workouts for each row execute function public.myfittrack_prevent_stale_update();
drop trigger if exists programs_prevent_stale on public.programs;
create trigger programs_prevent_stale before update on public.programs for each row execute function public.myfittrack_prevent_stale_update();
drop trigger if exists periodizations_prevent_stale on public.periodizations;
create trigger periodizations_prevent_stale before update on public.periodizations for each row execute function public.myfittrack_prevent_stale_update();
drop trigger if exists sessions_prevent_stale on public.workout_sessions;
create trigger sessions_prevent_stale before update on public.workout_sessions for each row execute function public.myfittrack_prevent_stale_update();
drop trigger if exists prs_prevent_stale on public.personal_records;
create trigger prs_prevent_stale before update on public.personal_records for each row execute function public.myfittrack_prevent_stale_update();
drop trigger if exists custom_ex_prevent_stale on public.custom_exercises;
create trigger custom_ex_prevent_stale before update on public.custom_exercises for each row execute function public.myfittrack_prevent_stale_update();
drop trigger if exists settings_prevent_stale on public.user_settings;
create trigger settings_prevent_stale before update on public.user_settings for each row execute function public.myfittrack_prevent_stale_update();
