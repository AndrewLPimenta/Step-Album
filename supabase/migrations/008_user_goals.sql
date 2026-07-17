-- ============================================================================
-- User goals ("metas") — each user sets one ongoing personal goal, either a
-- financial target (earnings) or an album-count target. Strictly personal:
-- readable/writable only by the owning user, same as their own row in
-- `users` would be for self-editable fields.
-- ============================================================================

create table public.user_goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.users(id) on delete cascade,
  goal_type   text not null check (goal_type in ('valor', 'albuns')),
  goal_value  numeric not null check (goal_value > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger user_goals_set_updated_at
  before update on public.user_goals
  for each row execute function public.tg_set_updated_at();

alter table public.user_goals enable row level security;

create policy "user_goals_select_own"
  on public.user_goals for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_goals_insert_own"
  on public.user_goals for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_goals_update_own"
  on public.user_goals for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_goals_delete_own"
  on public.user_goals for delete
  to authenticated
  using (user_id = auth.uid());
