create table if not exists public.user_workout_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.user_workout_data enable row level security;

revoke all on table public.user_workout_data from anon, authenticated;
grant select, insert, update, delete on table public.user_workout_data to authenticated;

create policy "Users can read their workout data"
on public.user_workout_data for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their workout data"
on public.user_workout_data for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their workout data"
on public.user_workout_data for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their workout data"
on public.user_workout_data for delete to authenticated
using ((select auth.uid()) = user_id);
