-- ============================================================================
-- Sync devices — o código do Syncthing de cada pessoa.
--
-- Parear o Syncthing exige que cada máquina conheça o ID das outras: são 63
-- caracteres, e com 4 pessoas dá 6 trocas. Passar isso por mensagem quebra
-- em duas linhas e alguém cola errado. Aqui fica num lugar só.
--
-- Diferente das outras tabelas pessoais (user_goals, sprint_*), a LEITURA é
-- aberta a todo usuário autenticado — é justamente o ponto: cada um precisa
-- ver o código dos outros. A ESCRITA continua restrita à própria linha.
--
-- O device ID não é segredo: sozinho não dá acesso a nada, porque o outro
-- lado ainda precisa aceitar o pareamento e escolher o que compartilhar.
-- ============================================================================

create table public.sync_devices (
  user_id     uuid primary key references public.users(id) on delete cascade,
  device_id   text not null,
  apelido     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- 8 grupos de 7 caracteres separados por hífen (formato do Syncthing)
  constraint sync_devices_formato
    check (device_id ~ '^[A-Z0-9]{7}(-[A-Z0-9]{7}){7}$')
);

create trigger sync_devices_set_updated_at
  before update on public.sync_devices
  for each row execute function public.tg_set_updated_at();

alter table public.sync_devices enable row level security;

-- leitura: todo mundo da equipe vê todo mundo
create policy "sync_devices_select_all"
  on public.sync_devices for select
  to authenticated
  using (true);

-- escrita: só a própria linha
create policy "sync_devices_insert_own"
  on public.sync_devices for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "sync_devices_update_own"
  on public.sync_devices for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sync_devices_delete_own"
  on public.sync_devices for delete
  to authenticated
  using (user_id = auth.uid());
