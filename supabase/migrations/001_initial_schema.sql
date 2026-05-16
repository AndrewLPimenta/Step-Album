-- ============================================================================
-- Album Control System - Initial Schema
-- ============================================================================
-- Run this AFTER creating your Supabase project and BEFORE running RLS/seed.
-- Order: 001_initial_schema.sql -> 002_rls_policies.sql -> seed-users -> seed-data
-- ============================================================================

-- Required extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'diagramador');

create type album_type as enum ('colab', 'faculdade', 'especial', 'medicina');

create type album_status as enum (
  'baixado',
  'editando',
  'descartado',
  'montado',
  'enviado',
  'concluido'
);

create type problem_type as enum (
  'formando_duplicado',
  'fotos_insuficientes',
  'erro_download',
  'arquivos_corrompidos',
  'outro'
);

-- ----------------------------------------------------------------------------
-- USERS (profiles - mirrors auth.users)
-- ----------------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null,
  role        user_role not null default 'diagramador',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index users_role_idx on public.users(role);
create index users_active_idx on public.users(active);

-- ----------------------------------------------------------------------------
-- ALBUMS
-- ----------------------------------------------------------------------------
create table public.albums (
  id                    uuid primary key default gen_random_uuid(),
  student_name          text not null,
  faculty               text not null,
  type                  album_type not null,
  value                 numeric(10,2) not null,
  status                album_status not null default 'baixado',
  responsible_id        uuid not null references public.users(id) on delete restrict,
  notes                 text,
  -- Financial cycle (computed by application but stored for fast queries)
  cycle_start           date,
  cycle_end             date,
  payment_date          date,
  -- Timestamps
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  completed_at          timestamptz
);

create index albums_responsible_idx on public.albums(responsible_id);
create index albums_status_idx on public.albums(status);
create index albums_type_idx on public.albums(type);
create index albums_created_at_idx on public.albums(created_at desc);
create index albums_completed_at_idx on public.albums(completed_at desc);
create index albums_payment_date_idx on public.albums(payment_date);
create index albums_cycle_idx on public.albums(cycle_start, cycle_end);

-- ----------------------------------------------------------------------------
-- ALBUM PROBLEMS (many-to-one)
-- ----------------------------------------------------------------------------
create table public.album_problems (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid not null references public.albums(id) on delete cascade,
  problem     problem_type not null,
  description text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index album_problems_album_idx on public.album_problems(album_id);
create index album_problems_resolved_idx on public.album_problems(resolved);

-- ----------------------------------------------------------------------------
-- AUDIT LOGS
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index audit_logs_user_idx on public.audit_logs(user_id);
create index audit_logs_entity_idx on public.audit_logs(entity, entity_id);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

-- ----------------------------------------------------------------------------
-- FUNCTIONS / TRIGGERS
-- ----------------------------------------------------------------------------

-- updated_at auto-update
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.tg_set_updated_at();

create trigger albums_set_updated_at
  before update on public.albums
  for each row execute function public.tg_set_updated_at();

-- Auto-set value based on album type (server-side guarantee, no frontend trust)
create or replace function public.tg_set_album_value()
returns trigger
language plpgsql
as $$
begin
  new.value := case new.type
    when 'colab'     then 15.00
    when 'faculdade' then 20.00
    when 'especial'  then 25.00
    when 'medicina'  then 75.00
  end;
  return new;
end;
$$;

create trigger albums_set_value
  before insert or update of type on public.albums
  for each row execute function public.tg_set_album_value();

-- Auto-set completed_at when status is 'concluido'
create or replace function public.tg_set_album_completed_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'concluido' and new.completed_at is null then
      new.completed_at := now();
    end if;
    return new;
  end if;

  -- UPDATE
  if new.status = 'concluido' and (old.status is distinct from 'concluido') then
    new.completed_at := now();
  end if;
  if new.status <> 'concluido' and old.status = 'concluido' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger albums_set_completed_on_insert
  before insert on public.albums
  for each row execute function public.tg_set_album_completed_at();

create trigger albums_set_completed_on_update
  before update of status on public.albums
  for each row execute function public.tg_set_album_completed_at();

-- ----------------------------------------------------------------------------
-- HELPER: payment cycle calculation (kept in DB for ad-hoc queries)
-- ----------------------------------------------------------------------------
-- Rules:
--   Production between day 03 (inclusive) and day 18 (exclusive) of month M:
--     cycle = [M-03, M-18) -> payment date = (M+1)-03
--   Production between day 18 (inclusive) of month M and day 03 (exclusive) of month M+1:
--     cycle = [M-18, (M+1)-03) -> payment date = (M+1)-18
create or replace function public.compute_payment_cycle(d date)
returns table(cycle_start date, cycle_end date, payment_date date)
language plpgsql
immutable
as $$
declare
  day_part int;
  year_part int;
  month_part int;
begin
  day_part := extract(day from d)::int;
  year_part := extract(year from d)::int;
  month_part := extract(month from d)::int;

  if day_part >= 3 and day_part < 18 then
    cycle_start  := make_date(year_part, month_part, 3);
    cycle_end    := make_date(year_part, month_part, 18);
    payment_date := (cycle_start + interval '1 month')::date;
    return next;
    return;
  end if;

  if day_part >= 18 then
    cycle_start  := make_date(year_part, month_part, 18);
    cycle_end    := (make_date(year_part, month_part, 1) + interval '1 month' + interval '2 days')::date; -- next month day 3
    payment_date := (make_date(year_part, month_part, 18) + interval '1 month')::date;
  else
    -- day < 3
    cycle_start  := (make_date(year_part, month_part, 1) - interval '1 month' + interval '17 days')::date; -- prev month day 18
    cycle_end    := make_date(year_part, month_part, 3);
    payment_date := make_date(year_part, month_part, 18);
  end if;

  return next;
end;
$$;
