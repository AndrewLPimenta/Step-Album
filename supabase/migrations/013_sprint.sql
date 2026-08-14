-- ============================================================================
-- Sprint — planejamento pessoal da quinzena.
--
-- Duas tabelas, ambas estritamente pessoais (mesmo modelo de `user_goals`):
--
--   sprint_settings  — uma linha por usuário: quanto tempo custa cada tipo
--                      de álbum, quantas horas por dia ele trabalha, e para
--                      qual status o check da sprint move o álbum.
--   sprint_days_off  — os dias em que ele NÃO vai trabalhar. A distribuição
--                      dos álbuns pelos dias da quinzena pula esses.
--
-- O que NÃO tem tabela: a lista de álbuns da sprint. Ela é derivada dos
-- álbuns pendentes do próprio usuário no ciclo atual e redistribuída a cada
-- render — é isso que faz a sprint "se ajustar sozinha" quando um álbum é
-- concluído ou um dia de folga é marcado. Guardar a distribuição
-- congelaria justamente o comportamento desejado.
-- ============================================================================

create table public.sprint_settings (
  user_id             uuid primary key references public.users(id) on delete cascade,

  -- minutos por álbum, por tipo (medicina em minutos também: 180 = 3h)
  minutos_colab       integer not null default 10  check (minutos_colab     > 0),
  minutos_faculdade   integer not null default 15  check (minutos_faculdade > 0),
  minutos_especial    integer not null default 20  check (minutos_especial  > 0),
  minutos_medicina    integer not null default 180 check (minutos_medicina  > 0),

  -- jornada considerada no rateio dos álbuns pelos dias
  horas_por_dia       numeric not null default 8
                      check (horas_por_dia > 0 and horas_por_dia <= 24),

  -- para onde o check da sprint manda o álbum. 'enviado' fecha o ciclo
  -- financeiro (o app recalcula cycle_start nessa transição); 'montado'
  -- serve para quem prefere separar montagem de envio.
  status_do_check     album_status not null default 'enviado',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger sprint_settings_set_updated_at
  before update on public.sprint_settings
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------- dias off
create table public.sprint_days_off (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  dia         date not null,
  motivo      text,
  created_at  timestamptz not null default now(),

  unique (user_id, dia)
);

create index sprint_days_off_user_dia_idx
  on public.sprint_days_off (user_id, dia);

-- -------------------------------------------------------------------- RLS
alter table public.sprint_settings enable row level security;
alter table public.sprint_days_off enable row level security;

create policy "sprint_settings_select_own"
  on public.sprint_settings for select
  to authenticated
  using (user_id = auth.uid());

create policy "sprint_settings_insert_own"
  on public.sprint_settings for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "sprint_settings_update_own"
  on public.sprint_settings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sprint_settings_delete_own"
  on public.sprint_settings for delete
  to authenticated
  using (user_id = auth.uid());

create policy "sprint_days_off_select_own"
  on public.sprint_days_off for select
  to authenticated
  using (user_id = auth.uid());

create policy "sprint_days_off_insert_own"
  on public.sprint_days_off for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "sprint_days_off_update_own"
  on public.sprint_days_off for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sprint_days_off_delete_own"
  on public.sprint_days_off for delete
  to authenticated
  using (user_id = auth.uid());
