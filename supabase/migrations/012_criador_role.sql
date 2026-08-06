-- ============================================================================
-- New role: 'criador' — top permission tier.
-- ============================================================================
-- Only 'criador' can now: see every album (not just their own), access
-- /usuarios, manage users, and see the gross ("dono") value on /financial.
-- 'admin' keeps every capability it has today (creating/importing albums for
-- other people, editing/deleting any album) — it just stops being the tier
-- that grants full read visibility and user management. Andrew and Duda are
-- promoted to 'criador'; Gabriel and Laura stay 'admin' unchanged.
--
-- IMPORTANT: run this as TWO separate executions in the SQL editor.
-- Postgres will not let a new enum value be used in the same transaction
-- that adds it ("unsafe use of new value of enum type").
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1 — run this alone first, then run PART 2 below as a second query.
-- ----------------------------------------------------------------------------
-- alter type public.user_role add value 'criador';


-- ----------------------------------------------------------------------------
-- PART 2 — run after PART 1 has committed.
-- ----------------------------------------------------------------------------

-- Promote Andrew and Duda(Maria) to criador.
update public.users set role = 'criador'
  where email in ('andrewpimenta.dev@gmail.com', 'maria.edu.franca@gmail.com');

-- Helper mirroring is_admin(), for the new tier.
create or replace function public.is_criador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'criador' from public.users where id = auth.uid()), false);
$$;

revoke all on function public.is_criador() from public;
grant execute on function public.is_criador() to authenticated;

-- ----------------------------------------------------------------------------
-- USERS — /usuarios management moves from admin to criador-only.
-- ----------------------------------------------------------------------------
drop policy if exists "users_insert_admin" on public.users;
create policy "users_insert_criador"
  on public.users for insert
  to authenticated
  with check (public.is_criador());

drop policy if exists "users_update_admin_or_self" on public.users;
create policy "users_update_criador_or_self"
  on public.users for update
  to authenticated
  using (public.is_criador() or id = auth.uid())
  with check (
    public.is_criador()
    or (id = auth.uid() and role = (select role from public.users where id = auth.uid())
                       and active = (select active from public.users where id = auth.uid()))
  );

drop policy if exists "users_delete_admin" on public.users;
create policy "users_delete_criador"
  on public.users for delete
  to authenticated
  using (public.is_criador());

-- ----------------------------------------------------------------------------
-- ALBUMS — reading everyone's albums moves to criador-only. Writing
-- (create/import/edit/delete for anyone) stays exactly as it is today, so
-- admin keeps importing from Kaz and managing albums for other people.
-- ----------------------------------------------------------------------------
drop policy if exists "albums_select" on public.albums;
create policy "albums_select"
  on public.albums for select
  to authenticated
  using (public.is_criador() or responsible_id = auth.uid());

drop policy if exists "albums_insert" on public.albums;
create policy "albums_insert"
  on public.albums for insert
  to authenticated
  with check (public.is_admin() or public.is_criador() or responsible_id = auth.uid());

drop policy if exists "albums_update" on public.albums;
create policy "albums_update"
  on public.albums for update
  to authenticated
  using (public.is_admin() or public.is_criador() or responsible_id = auth.uid())
  with check (public.is_admin() or public.is_criador() or responsible_id = auth.uid());

drop policy if exists "albums_delete_admin" on public.albums;
create policy "albums_delete_admin_or_criador"
  on public.albums for delete
  to authenticated
  using (public.is_admin() or public.is_criador());

-- ----------------------------------------------------------------------------
-- ALBUM PROBLEMS — unchanged tier (admin or criador or own album), just add
-- criador so Andrew/Duda don't lose access after losing the 'admin' role.
-- ----------------------------------------------------------------------------
drop policy if exists "problems_select" on public.album_problems;
create policy "problems_select"
  on public.album_problems for select
  to authenticated
  using (
    public.is_admin() or public.is_criador()
    or exists (select 1 from public.albums a where a.id = album_id and a.responsible_id = auth.uid())
  );

drop policy if exists "problems_insert" on public.album_problems;
create policy "problems_insert"
  on public.album_problems for insert
  to authenticated
  with check (
    public.is_admin() or public.is_criador()
    or exists (select 1 from public.albums a where a.id = album_id and a.responsible_id = auth.uid())
  );

drop policy if exists "problems_update" on public.album_problems;
create policy "problems_update"
  on public.album_problems for update
  to authenticated
  using (
    public.is_admin() or public.is_criador()
    or exists (select 1 from public.albums a where a.id = album_id and a.responsible_id = auth.uid())
  );

drop policy if exists "problems_delete" on public.album_problems;
create policy "problems_delete"
  on public.album_problems for delete
  to authenticated
  using (
    public.is_admin() or public.is_criador()
    or exists (select 1 from public.albums a where a.id = album_id and a.responsible_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- AUDIT LOGS — same tier as before, add criador.
-- ----------------------------------------------------------------------------
drop policy if exists "audit_select_admin" on public.audit_logs;
create policy "audit_select_admin_or_criador"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin() or public.is_criador());
