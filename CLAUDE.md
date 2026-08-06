# StepAlbum — contexto completo do projeto

Sistema interno de controle de produção de álbuns de formatura. Uso interno da equipe (diagramadores + admin), não é produto público.

Este arquivo existe para que qualquer instância do Claude Code que abra este repositório tenha, de cara, todo o contexto de negócio, arquitetura e acesso a dados que normalmente só se acumula ao longo de várias conversas. Leia isto antes de mexer em qualquer coisa relacionada a ciclos de pagamento, `/fila`, `/financial` ou dados de álbuns.

## Stack

- **Next.js 15** (App Router), **TypeScript**, **React 18.3.1** (não é React 19 — `useOptimistic` não existe aqui, se precisar de UI otimista tem que fazer na mão com `useState`).
- **Tailwind CSS + shadcn/ui** (componentes em `src/components/ui`).
- **Supabase**: Postgres + Auth + RLS + Storage (bucket `arquivos`, privado, URLs assinadas).
- **Zod** para validação em server actions. **react-hook-form** nos formulários.
- **Vercel** para deploy (auto-deploy no push pra `main`) e Vercel Cron para jobs agendados.
- Deploy: push em `main` → Vercel builda e publica automaticamente. Não existe branch de staging separada neste fluxo.

## Como rodar / verificar localmente

```bash
npm run dev            # dev server
npx tsc --noEmit        # type-check — baseline conhecida: 12 erros, todos em
                         # src/server/actions/albums.ts e users.ts, por causa de
                         # uma incompatibilidade de generics do @supabase/ssr
                         # (documentada em next.config.ts, ignoreBuildErrors).
                         # NÃO tente corrigir esses 12 — são esperados. Só se
                         # preocupe se o número mudar.
npm run lint             # deve sair limpo
npm run build            # deve buildar sem erros
```

Fluxo padrão depois de qualquer mudança: `tsc --noEmit` (esperar 12) → `lint` (esperar limpo) → `build` (esperar sucesso) → commit → **push** (o deploy só acontece com push; já tivemos incidente de fix commitado mas não pushado, então a Vercel nunca publicou).

Commits incluem `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` no rodapé.

## Acesso ao banco de dados (Supabase)

- Projeto Supabase real, produção. Credenciais em `.env.local` (gitignored, nunca commitado):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — usado pelos clients normais (RLS ativo).
  - `SUPABASE_SERVICE_ROLE_KEY` — **bypassa RLS**. Usado em server actions/route handlers via `createAdminClient()` (`src/lib/supabase/server.ts`), e em scripts avulsos para leitura/escrita direta de dados.
- **A service role key NÃO permite DDL/schema changes** (criar tabela, coluna, trigger, function, RLS policy). Para qualquer migration, o Andrew cola o SQL manualmente no SQL Editor do painel Supabase — ele prefere isso a compartilhar credenciais de owner do banco. Migrations ficam em `supabase/migrations/*.sql`, numeradas sequencialmente (001 a 012 até agora), mas **aplicar** é sempre manual por ele.
- Migration 012 (`criador_role`) precisa ser rodada em **duas execuções separadas** no SQL Editor — Postgres não deixa usar um valor de enum novo (`alter type ... add value`) na mesma transação em que ele foi criado.
- Para leitura/escrita de **dados** (não schema) fora do fluxo normal da app — reconciliação financeira, correções em massa, investigação de bug — é comum criar um script `.mjs`/`.ts` descartável na raiz do repo (prefixo `scratch-`), usando `@supabase/supabase-js` com a service role key lida de `.env.local`. **Sempre apagar esse script depois de usar** — nunca commitar. Para importar módulos TS da própria app (ex. `src/lib/financial.ts`) dentro de um script assim, rodar com `TZ=UTC npx tsx arquivo.ts` (o `TZ=UTC` evita que o runtime local distorça os cálculos de fuso — o financial.ts já normaliza pra horário de Brasília internamente, então rodar com outro TZ de base garante que o teste reflete o que roda em produção, que é UTC na Vercel).
- Mudanças de dados em massa (bulk status change, backfill financeiro, correção de tipo de turma, etc.) sempre com um insert em `audit_logs` (action, entity, entity_id, metadata com `reason` e IDs/contagens envolvidos), atribuído ao usuário admin (Andrew) ou à Duda dependendo do contexto pedido.
- Antes de rodar qualquer UPDATE/DELETE em massa em produção, mostrar o plano e pedir confirmação — não é ambiente de teste, é o banco real que a equipe usa.

## Quem é quem

- **Andrew** (andrewpimenta.dev@gmail.com) — `role = 'criador'`, dono do projeto, quem dá as instruções. Conhecimento técnico pleno (pode revisar código, SQL, discutir arquitetura diretamente).
- **Duda / Maria** (maria.edu.franca@gmail.com, nome no banco é "Duda") — `role = 'criador'`.
- **Gabriel** e **Laura** — `role = 'admin'`, `commission_rate = 0.6667`. Diagramadores na prática, mas mantidos como `admin` no banco (decisão explícita do Andrew, ver seção de roles abaixo) em vez de `diagramador`.
- Diagramadores — usuários com `role = 'diagramador'`, cada um responsável por um subconjunto de álbuns (`albums.responsible_id`).

## Modelo de permissões (roles)

Três roles em `user_role`: `admin | diagramador | criador`. **`criador` é o tier de acesso total** — introduzido em 2026-08-06 a pedido do Andrew para restringir quem vê os álbuns de todo mundo.

- **`criador`** (Andrew, Duda): vê todos os álbuns (não só os próprios) em `/fila`, `/albums`, `/dashboard`; acessa `/usuarios` (`requireCriador()` em `src/lib/auth.ts`); vê o valor bruto ("dono") no `/financial` (`isCommissioned` em `src/lib/queries.ts` checa `role !== 'criador'`) e o card "Ganhos por diagramador"/breakdown por pessoa.
- **`admin`** (Gabriel, Laura): **não é mais o tier de acesso total** — nisso se comporta como `diagramador` (só vê/edita os próprios álbuns via RLS, sem acesso a `/usuarios`, sem ver o breakdown financeiro de outras pessoas). Mas mantém as capacidades de **escrita** que já tinha antes: importar em massa da Kaz atribuindo a outras pessoas, editar/deletar qualquer álbum — essas checagens em `src/server/actions/albums.ts` (`createAlbumAction`, `createAlbumsBulkAction`, `deleteAlbumAction`, `bulkDeleteAction`) aceitam `role === 'admin' || role === 'criador'` de propósito, pra não regredir o que o Gabriel/Laura já faziam.
- **`diagramador`**: só vê/edita os próprios álbuns, sem nenhuma dessas capacidades extras.

RLS (migration 012, `supabase/migrations/012_criador_role.sql`) reflete essa mesma divisão:
- `albums_select`: `is_criador() or responsible_id = auth.uid()` — leitura de álbuns de outras pessoas é **exclusiva de criador** (isso é o que faz o `admin` só ver os próprios em `/fila`/`/albums`/`/dashboard`, sem precisar de filtro extra no app).
- `albums_insert`/`albums_update`/`albums_delete`: `is_admin() or is_criador() or responsible_id = auth.uid()` — escrita continua igual a antes pra admin.
- `users_*` (insert/update/delete): só `is_criador()` (mais auto-edição do próprio nome).

**Se pedirem pra adicionar mais alguém como "vê tudo"**: é só rodar `update public.users set role = 'criador' where email = '...'`. **Se pedirem pra restringir a visão de mais alguém**: mudar o `role` dele pra `diagramador` (ou deixar `admin`, que já tem a mesma restrição de leitura).

## Modelo de dados

### `users`
`id, email, name, role ('admin'|'diagramador'), active, commission_rate (numeric|null), created_at, updated_at`

- `role = 'admin'` sem `commission_rate` → **"isOwner"**: vê o valor bruto (`value`) do álbum como ganho.
- Qualquer outro caso (diagramador, ou admin com `commission_rate` setado — ex. a Laura) → **"isCommissioned"**: recebe o valor fixo por tipo de álbum (`DIAGRAMADOR_PAYOUTS`), não o valor cobrado do cliente.
- `active = false` bloqueia login (ver `requireUser` em `src/lib/auth.ts`) e não aparece em listagens de responsáveis.

### `albums`
`id, student_name, class_code, student_code, faculty, type (album_type), status (album_status), value (numeric), responsible_id → users.id, notes, kaz_id, created_at, updated_at, completed_at, cycle_start, cycle_end, payment_date`

**`album_type`**: `colab | faculdade | especial | medicina`
Valores cobrados do cliente (`ALBUM_VALUES` em `src/lib/constants.ts`): colab=15, faculdade=20, especial=25, **medicina=70** (era 75, corrigido — ver migration 010).
Repasse fixo ao diagramador (`DIAGRAMADOR_PAYOUTS`): colab=10, faculdade=15, especial=20, medicina=50.

**`album_status`**: `baixado | editando | montado | enviado | concluido | descartado | fotos_insuficientes | duplicado`
- `baixado → editando → montado → enviado → concluido` é o fluxo normal de produção.
- `descartado` = descartado do ciclo atual (não conta pra pagamento).
- `fotos_insuficientes` / `duplicado` = "inutilizáveis", aparecem em seções separadas na `/fila`, removidos automaticamente ao fim do ciclo pelo cron (`cleanup_cycle_excluded_albums`, function no banco).
- Só `enviado` e `concluido` contam como faturamento efetivo (ver `listSentAlbums`, `revenueByUser`, `revenueByCycle`).

**`cycle_start` / `cycle_end` / `payment_date`**: setados na criação do álbum (baseado no "agora" daquele momento) e **recalculados somente quando o status vira `enviado`**. Isso é crítico: um álbum que fica meses em `baixado`/`editando`/`montado` mantém o `cycle_start` de quando foi criado, por mais antigo que seja — esse campo NÃO reflete "em qual ciclo este trabalho está pendente agora", só "em qual ciclo ele foi criado ou finalmente enviado". Isso já causou múltiplos bugs de sumiço de `/fila` — ver seção "Ciclos de pagamento" abaixo.

**`kaz_id`**: id do formando no sistema externo Kaz (plataforma de onde vêm as fotos/dados dos formandos). Usado para montar a URL de download (`KAZ_DOWNLOAD_URL`). Turmas/álbuns às vezes têm `student_code = "0000"` como placeholder quando importados errado da Kaz — ao fazer buscas/correções em lote, sempre checar por nome também, não só por código, porque isso já causou vários registros "perdidos" em operações anteriores.

### `album_problems`
`id, album_id → albums.id, problem (problem_type), description, resolved, resolved_at, created_at`
`problem_type`: `formando_duplicado | fotos_insuficientes | erro_download | arquivos_corrompidos | outro`

### `audit_logs`
`id, action, entity, entity_id, metadata (jsonb), user_id → users.id, created_at`
Convenção de uso: toda operação manual/bulk relevante grava um registro aqui com `reason` no metadata.

### `user_goals` (não está no `Database` gerado — declarado manualmente em `src/types/database.ts`)
`id, user_id → users.id, goal_type ('valor'|'albuns'), goal_value, created_at, updated_at`
Meta contínua pessoal do diagramador (não por ciclo). RLS restringe à própria linha do usuário — página `/metas`.

### `arquivos` (idem, não está no `Database` gerado)
`id, title, description, category, kind ('arquivo'|'link'), link_url, storage_path, file_name, file_size, mime_type, created_by → users.id, created_at, updated_at`
`category`: `contrato | tutorial | modelo | software | automações | outro`
Biblioteca compartilhada de links/arquivos, CRUD aberto pra qualquer usuário autenticado — página `/arquivos`. Arquivos ficam no bucket Storage `arquivos` (privado), URLs assinadas geradas sob demanda (`ARQUIVO_SIGNED_URL_TTL_SECONDS = 1h`) em `listArquivos()` (`src/lib/queries.ts`).

### Funções/RPCs no banco
- `compute_payment_cycle(d)` — versão SQL do cálculo de ciclo (espelha `computePaymentCycle` do TS).
- `current_user_role()`, `is_admin()` — usadas nas RLS policies.
- `cleanup_cycle_excluded_albums()` — deleta álbuns `fotos_insuficientes`/`duplicado` cujo ciclo já fechou. Chamada pelo cron diário.

## Regra de negócio: ciclos de pagamento (a parte mais delicada do sistema)

Ciclos quinzenais, começando nominalmente nos dias **03** e **18** de cada mês:
- Produção entre dia 03 (inclusive) e 18 (exclusivo) do mês M → paga dia 03 do mês M+1.
- Produção entre dia 18 (inclusive) do mês M e dia 03 (exclusivo) do mês M+1 → paga dia 18 do mês M+1.

Duas funções em `src/lib/financial.ts`:
- `computePaymentCycle(input)` — pura, baseada em dia calendário, **não é hour-aware**. Usada pra rotular/encadear ciclos (ex. "qual é o próximo ciclo depois deste"), nunca pra decidir "qual é o ciclo agora".
- `computePaymentCycleForInstant(instant)` — hour-aware, usada pra qualquer "agora" real (criação de álbum, transição pra `enviado`, cálculo do "ciclo atual" nas páginas). Implementada deslocando `toBrazilTime(instant)` **24h para trás** (`CYCLE_CUTOFF_HOUR = 24`) antes de chamar `computePaymentCycle`. Isso faz o dia-limite (03 ou 18) inteiro ainda contar como parte do ciclo ANTERIOR (até 23:59), e o novo ciclo só começa 00:00 do dia seguinte (04 ou 19). **Confirmado com o Andrew em 2026-08-03** depois de múltiplas idas e vindas (já foi 18h-mesmo-dia, já foi tentado com `CYCLE_CUTOFF_HOUR = 0`, ambos errados — não reintroduzir sem confirmar de novo).

`toBrazilTime(d)` / `nowBR()` — normalizam qualquer instante pra horário de parede de Brasília (America/Sao_Paulo, UTC-3 fixo, sem horário de verão) independente do fuso do runtime do servidor (a Vercel roda em UTC). **Qualquer comparação de data ligada a ciclo de pagamento tem que passar por aqui primeiro.**

### O bug recorrente: `/fila` "sumindo"

Like descrito acima, `cycle_start` só é recalculado quando o status vira `enviado`. Um álbum parado em `baixado`/`editando`/`montado` por semanas mantém um `cycle_start` velho. Isso já gerou um ciclo inteiro de correções contraditórias — a regra que ficou **definitiva** depois de confirmação explícita do Andrew (06/08/2026):

> Álbuns não finalizados (não `enviado`/`concluído`) do ciclo anterior devem migrar pro ciclo atual — e isso deve continuar acontecendo a cada virada de ciclo, daqui pra frente. Mas nada mais antigo que "o ciclo anterior ao atual" deve aparecer na fila — não é pra puxar histórico de vários ciclos atrás, só um passo por vez.

Implementação atual (mecanismo de **dois passos**, não confundir um com o outro):

1. **Filtro estrito em `/fila` e no dashboard** ("Álbuns por diagramador", `computeDashboardStats` em `src/lib/queries.ts`): só mostra álbuns cujo `cycle_start === ciclo atual` (`toDateOnly(computePaymentCycleForInstant(new Date()).cycleStart)`). Sem exceção de "sempre mostrar não finalizados independente da idade" — essa abordagem já foi tentada e trazia de volta trabalho de ciclos muito antigos, o que o Andrew rejeitou explicitamente.
2. **Cron diário** (`src/app/api/cron/cleanup-inutilizaveis/route.ts`, agendado via `vercel.json` — `"0 6 * * *"` UTC = 03:00 Brasília, protegido por header `Authorization: Bearer $CRON_SECRET`) faz o trabalho pesado de mover os dados: além de limpar inutilizáveis expirados, dá `UPDATE` em `cycle_start`/`cycle_end`/`payment_date` de todo álbum ainda em `baixado`/`editando`/`montado` cujo `cycle_start` seja **exatamente o ciclo anterior ao atual** (um hop só, não um loop pra trás no tempo) — empurrando pro ciclo atual.

**Ponto de atenção conhecido**: em 06/08/2026 descobrimos que o cron não estava rodando de fato em produção (nenhum álbum tinha `cycle_start` do novo ciclo mesmo dias depois da virada) — causa raiz não confirmada, suspeita principal é `CRON_SECRET` não configurada nas env vars da Vercel, ou Cron Jobs não habilitado no plano do projeto. Precisa verificar no painel da Vercel (Project → Settings → Environment Variables, e Project → Cron Jobs → histórico de execuções). Enquanto isso não for resolvido, o rollover pode precisar ser rodado manualmente (mesma lógica exata do route handler, replicável num scratch script) sempre que uma virada de ciclo passar sem os álbuns pendentes migrarem sozinhos.

Se `/fila` ou "Álbuns por diagramador" parecer "vazio" ou "sumindo" álbuns de novo: **primeiro** verificar se é exatamente esse padrão (cron não rodou, `cycle_start` velho, ciclo virou) antes de mexer na lógica de novo — já foi corrigido/revertido várias vezes por interpretações diferentes da mesma frase do Andrew. A regra atual (passo 1 e 2 acima) é o estado final confirmado, não um rascunho.

## Convenções de estilo do código (já estabelecidas, seguir)

- Comentários só quando explicam um "porquê" não óbvio (constraint escondida, invariante, workaround de bug específico) — não descrever o que o código faz.
- Sem abstração prematura — preferir repetição simples a generalizar cedo.
- Server Components + Server Actions como padrão; client components só quando precisa de interatividade.
- `useOptimistic` **não existe** nesta versão do React (18.3.1) — UI otimista é feita na mão (`useState` com override + revert em caso de erro), ver `src/components/fila/fila-queue.tsx` e `src/components/fila/reassign-select.tsx` como referência do padrão usado.
- Zod schemas em `src/server/actions/*` e `src/lib/validations.ts` para toda entrada de server action.

## Contas Kaz (sistema externo)

"Kaz" é a plataforma/fornecedora externa de onde vêm os dados dos formandos e as fotos originais (`kaz_id`, `KAZ_DOWNLOAD_URL`). Reconciliação de dados entre o banco do StepAlbum e o que aparece no site da Kaz é uma tarefa recorrente (comparar listas de formandos por turma, achar faltantes/duplicados). Ver também `MANUAL-KAZ.md` na raiz do repo para o processo manual existente.

## Coisas que já foram feitas e não precisam ser refeitas

- Bug de timezone no cálculo de ciclo (resolvido via `toBrazilTime`).
- Preço da medicina corrigido de R$75 → R$70 (constante, trigger no banco, linhas existentes) — migration 010.
- Reconciliação financeira de vários ciclos (18/04 a 3/08 já batem com valores reais confirmados pelo Andrew) via álbuns "backfill"/placeholder inseridos com `created_at` retroativo pra não poluir a `/fila` atual.
- UI da `/fila`: filtros de tipo/responsável, largura consistente com o shell (`max-w-7xl`), cards por usuário 4-por-linha, seções colapsáveis por diagramador, nome do dono inline em cada linha.
