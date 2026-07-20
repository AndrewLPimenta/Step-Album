-- ============================================================================
-- Arquivos — shared team library of links and uploaded files (contracts,
-- tutorials, templates, etc). Fully open: any authenticated user can add,
-- edit, or delete any entry (shared team board, not per-user ownership).
-- `created_by` is still recorded for display/accountability even though it
-- doesn't gate write access.
-- ============================================================================

create table public.arquivos (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  category      text not null check (category in ('contrato', 'tutorial', 'modelo', 'outro')),
  kind          text not null check (kind in ('arquivo', 'link')),
  link_url      text,
  storage_path  text,
  file_name     text,
  file_size     bigint,
  mime_type     text,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint arquivos_kind_payload_check check (
    (kind = 'link'    and link_url is not null and storage_path is null)
    or
    (kind = 'arquivo' and storage_path is not null and link_url is null)
  )
);

create trigger arquivos_set_updated_at
  before update on public.arquivos
  for each row execute function public.tg_set_updated_at();

alter table public.arquivos enable row level security;

create policy "arquivos_select_authenticated"
  on public.arquivos for select
  to authenticated
  using (true);

create policy "arquivos_insert_authenticated"
  on public.arquivos for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "arquivos_update_authenticated"
  on public.arquivos for update
  to authenticated
  using (true)
  with check (true);

create policy "arquivos_delete_authenticated"
  on public.arquivos for delete
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- Storage bucket — private, 20MB per file. Signed URLs are generated
-- server-side on read; uploads/deletes go straight from the client to
-- Storage (bypassing Next.js server action payload limits).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('arquivos', 'arquivos', false, 20971520)
on conflict (id) do nothing;

create policy "arquivos_storage_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'arquivos');

create policy "arquivos_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'arquivos');

create policy "arquivos_storage_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'arquivos');
