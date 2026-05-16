-- ============================================================================
-- Album Control System - Row Level Security
-- ============================================================================
-- Diagramador: sees & edits ONLY their own albums.
-- Admin: full access.
-- Service role bypasses RLS automatically (used in seed scripts).
-- ============================================================================

-- Enable RLS
alter table public.users          enable row level security;
alter table public.albums         enable row level security;
alter table public.album_problems enable row level security;
alter table public.audit_logs     enable row level security;

-- ----------------------------------------------------------------------------
-- Helper: check current user role (avoid recursive RLS by using security definer)
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.users where id = auth.uid()), false);
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- USERS policies
-- ----------------------------------------------------------------------------
-- Anyone authenticated can read user list (needed for "responsible" dropdowns
-- and "by user" stats); only admins can write.
create policy "users_select_authenticated"
  on public.users for select
  to authenticated
  using (true);

create policy "users_insert_admin"
  on public.users for insert
  to authenticated
  with check (public.is_admin());

create policy "users_update_admin_or_self"
  on public.users for update
  to authenticated
  using (public.is_admin() or id = auth.uid())
  with check (
    -- Non-admin can update self but cannot escalate role or change active flag
    public.is_admin()
    or (id = auth.uid() and role = (select role from public.users where id = auth.uid())
                       and active = (select active from public.users where id = auth.uid()))
  );

create policy "users_delete_admin"
  on public.users for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- ALBUMS policies
-- ----------------------------------------------------------------------------
create policy "albums_select"
  on public.albums for select
  to authenticated
  using (public.is_admin() or responsible_id = auth.uid());

create policy "albums_insert"
  on public.albums for insert
  to authenticated
  with check (public.is_admin() or responsible_id = auth.uid());

create policy "albums_update"
  on public.albums for update
  to authenticated
  using (public.is_admin() or responsible_id = auth.uid())
  with check (public.is_admin() or responsible_id = auth.uid());

create policy "albums_delete_admin"
  on public.albums for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- ALBUM PROBLEMS policies
-- ----------------------------------------------------------------------------
create policy "problems_select"
  on public.album_problems for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.albums a
      where a.id = album_id and a.responsible_id = auth.uid()
    )
  );

create policy "problems_insert"
  on public.album_problems for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.albums a
      where a.id = album_id and a.responsible_id = auth.uid()
    )
  );

create policy "problems_update"
  on public.album_problems for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.albums a
      where a.id = album_id and a.responsible_id = auth.uid()
    )
  );

create policy "problems_delete"
  on public.album_problems for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.albums a
      where a.id = album_id and a.responsible_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- AUDIT LOGS - admin read only; any authenticated user inserts (server-side)
-- ----------------------------------------------------------------------------
create policy "audit_select_admin"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin());

create policy "audit_insert_authenticated"
  on public.audit_logs for insert
  to authenticated
  with check (user_id = auth.uid());
