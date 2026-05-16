# StepAlbum · Painel interno

Sistema web interno para controle de diagramação de álbuns de formatura. Painel operacional e financeiro construído para equipes pequenas (3–10 usuários).

**Stack:** Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn/ui · Supabase (Auth + DB + RLS) · Server Actions · Zod · Recharts.

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Pré-requisitos](#pré-requisitos)
3. [Setup do Supabase](#setup-do-supabase)
4. [Configuração local](#configuração-local)
5. [Seed dos usuários iniciais](#seed-dos-usuários-iniciais)
6. [Rodando o projeto](#rodando-o-projeto)
7. [Regras de negócio](#regras-de-negócio)
8. [Permissões](#permissões)
9. [Estrutura de pastas](#estrutura-de-pastas)
10. [Deploy](#deploy)

---

## Funcionalidades

- Login com Supabase Auth (e-mail/senha) com toggle de visibilidade da senha
- Recuperação e redefinição de senha via e-mail (Supabase Auth)
- Dashboard com produção semanal, mensal, por tipo, por status e por diagramador
- Tela de Álbuns com busca, filtros (status, tipo, responsável, turma, problemas) e paginação
- Identificação de álbum por código de turma (5 dígitos) + código de formando (4 dígitos)
- Layout responsivo: tabela no desktop, cards no mobile
- Atualização rápida de status inline
- Registro de problemas (múltiplos por álbum) com fluxo de resolução
- **Fila de trabalho** — todos veem todos os álbuns agrupados por responsável; admins reatribuem com um clique
- Cálculo automático de ciclo financeiro (regras 03/18) e data prevista de pagamento
- Ciclo financeiro recalculado no momento em que o álbum é marcado como `enviado`
- Página financeira (apenas admin): ciclo fechado (valor fixo) + ciclo em aberto (crescendo) + histórico
- Gerenciamento de usuários (criar/desativar/reativar)
- Todos os usuários veem todos os álbuns; escrita restrita ao próprio responsável (ou admin)
- Dark mode + responsivo

## Pré-requisitos

- Node.js 18.17+ (recomendado 20+)
- Conta no Supabase ([supabase.com](https://supabase.com))

## Setup do Supabase

### 1. Criar o projeto

1. Acesse [app.supabase.com](https://app.supabase.com) e crie um novo projeto.
2. Aguarde a provisão (~1 min).

### 2. Pegar as credenciais

Em **Project Settings → API**:

- `URL` → será `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` (em **Project Settings → API → Project API keys → Reveal**) → será `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ A `service_role` key NUNCA deve ser exposta ao cliente. Ela é usada apenas em scripts de seed e em server actions privilegiadas.

### 3. Rodar as migrations

Com o Supabase CLI configurado:

```bash
npx supabase db push
```

Ou cole cada arquivo na ordem abaixo no **SQL Editor** do Supabase Studio:

1. `supabase/migrations/001_initial_schema.sql` — cria tabelas, enums, triggers e funções
2. `supabase/migrations/002_rls_policies.sql` — ativa RLS e cria as políticas
3. `supabase/migrations/003_add_codes.sql` — adiciona `class_code` e `student_code` nos álbuns
4. `supabase/migrations/004_open_select_rls.sql` — abre SELECT de álbuns para todos os usuários autenticados

### 4. Configurações de Auth

Em **Authentication → Providers → Email**:

- ✅ Habilitar "Enable Email provider"
- ❌ Desabilitar "Confirm email" (já tratamos isso no seed)
- (Opcional) "Disable sign ups" para impedir cadastros públicos

Em **Authentication → URL Configuration**:

- Adicionar `http://localhost:3002/api/auth/callback` em **Redirect URLs** (troque pela URL de produção no deploy)

Isso é necessário para o fluxo de redefinição de senha funcionar.

## Configuração local

```bash
# 1. Clonar e instalar dependências
git clone <este-repo>
cd album-system
npm install

# 2. Criar .env.local a partir do exemplo
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

## Seed dos usuários iniciais

O sistema deve iniciar com 3 usuários pré-cadastrados. Rode:

```bash
npm run seed
```

Isso cria (ou atualiza) automaticamente:

| Nome   | E-mail                        | Senha       | Função      |
| ------ | ----------------------------- | ----------- | ----------- |
| Andrew | andrewpimenta.dev@gmail.com   | Andrew3122@ | admin       |
| Duda   | maria.edu.franca@gmail.com    | Joao5492@   | admin       |
| Laura  | lauraromaneli2@gmail.com      | Allbb326    | diagramador |

E também insere **álbuns de exemplo** com diferentes status e problemas (apenas se o banco estiver vazio).

Para rodar apenas o seed de usuários:

```bash
npm run seed:users
```

Para rodar apenas o seed de dados de demonstração:

```bash
npm run seed:data
```

## Rodando o projeto

```bash
npm run dev
```

Acesse [http://localhost:3002](http://localhost:3002) e faça login com qualquer um dos usuários acima.

Outros scripts:

```bash
npm run build       # build de produção
npm run start       # rodar build de produção
npm run lint        # ESLint
npm run type-check  # verificar tipos
```

## Regras de negócio

### Tipos e valores fixos

Os valores são **forçados pelo banco** via trigger (`tg_set_album_value`), impossibilitando manipulação pelo frontend:

| Tipo      | Valor   |
| --------- | ------- |
| colab     | R$15,00 |
| faculdade | R$20,00 |
| especial  | R$25,00 |
| medicina  | R$75,00 |

### Identificação de álbum

Cada álbum pode ter dois códigos opcionais:

- **Cód. turma** (`class_code`) — 5 dígitos, identifica a turma (ex.: `31080`)
- **Cód. formando** (`student_code`) — 4 dígitos, identifica o formando dentro da turma (ex.: `0913`)

O código composto é exibido como `31080·0913` na tabela e na fila de trabalho, em fonte monospace para facilitar a leitura.

### Ciclos de pagamento

A regra é centralizada em `src/lib/financial.ts`:

- Álbum marcado como `enviado` **entre o dia 03 (incl.) e o dia 18 (excl.)** do mês M
  → ciclo `[M-03, M-18)` → pagamento no **dia 03 de M+1**
- Álbum marcado como `enviado` **entre o dia 18 (incl.) de M e o dia 03 (excl.) de M+1**
  → ciclo `[M-18, M+1-03)` → pagamento no **dia 18 de M+1**

Os campos `cycle_start`, `cycle_end` e `payment_date` são **recalculados no momento em que o status muda para `enviado`**, garantindo que o ciclo reflita o dia real do envio, não o dia de criação do álbum.

### Página financeira

Exibe dois cartões principais:

- **Fechado · valor fixo** (âmbar) — ciclo anterior cujo prazo já encerrou; valor não muda mais
- **Em aberto** (azul) — ciclo atual; valor cresce conforme novos álbuns são enviados

Abaixo dos cartões há um resumo dos próximos pagamentos e o histórico de ciclos passados, com detalhamento por usuário.

### Status do álbum

`baixado` → `editando` → `montado` → `enviado` → `concluido`. Existe ainda `descartado` (não conta para receita/produção).

Quando o status vai para `concluido`, o trigger `tg_set_album_completed_at` preenche `completed_at = now()` automaticamente. Se sair de `concluido`, o campo é limpo.

### Problemas

Tipos possíveis: `formando_duplicado`, `fotos_insuficientes`, `erro_download`, `arquivos_corrompidos`, `outro`. Um álbum pode ter múltiplos problemas. Cada problema possui flag `resolved` e timestamp `resolved_at`.

## Permissões

### Admin

- Vê todos os álbuns de todos os diagramadores
- Edita qualquer álbum, reatribui responsável, exclui
- Reatribui álbuns diretamente na **Fila de trabalho** via select inline
- Acessa `/financial` com receita total, mensal, por ciclo e por diagramador
- Gerencia usuários em `/users` (criar, desativar, reativar)

### Diagramador

- Vê **todos** os álbuns do sistema (para saber quem está fazendo qual)
- Edita apenas os **próprios** álbuns (RLS impede escrita em álbuns alheios)
- Não acessa `/financial` nem `/users`
- Pode trocar status, adicionar problemas e observações nos próprios álbuns
- Não pode reatribuir álbum para outra pessoa

> Toda a verificação acontece no servidor: middleware redireciona, server actions checam role, e RLS impede escrita direta à base mesmo via API.

### Redefinição de senha

Qualquer usuário pode solicitar redefinição de senha em `/forgot-password`. O Supabase envia um link para o e-mail cadastrado; o link redireciona para `/reset-password`, onde o usuário define uma nova senha. Nenhum dado de senha trafega pelo frontend — tudo é processado pelo Supabase Auth.

## Estrutura de pastas

```
album-system/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/
│  │  │  ├─ login/                  # tela de login
│  │  │  ├─ forgot-password/        # solicitar reset de senha
│  │  │  └─ reset-password/         # definir nova senha
│  │  ├─ (dashboard)/               # área autenticada
│  │  │  ├─ dashboard/              # dashboard principal
│  │  │  ├─ albums/                 # lista, detalhe, novo
│  │  │  ├─ fila/                   # fila de trabalho (todos os usuários)
│  │  │  ├─ financial/              # apenas admin
│  │  │  └─ users/                  # apenas admin
│  │  ├─ api/auth/callback/         # callback do fluxo de auth (PKCE)
│  │  ├─ globals.css                # design tokens + dark mode
│  │  ├─ layout.tsx                 # ThemeProvider + Toaster
│  │  ├─ page.tsx                   # redireciona p/ /dashboard
│  │  ├─ not-found.tsx, error.tsx, loading.tsx
│  │
│  ├─ components/
│  │  ├─ ui/                        # shadcn primitives
│  │  ├─ layout/                    # sidebar, header, theme-toggle
│  │  ├─ albums/                    # form, table, badges, problems, filters
│  │  ├─ fila/                      # reassign-select (admin inline)
│  │  ├─ dashboard/                 # stat-card, charts
│  │  ├─ users/                     # users-list
│  │  ├─ auth/                      # login-form
│  │  └─ providers/                 # theme-provider
│  │
│  ├─ lib/
│  │  ├─ supabase/                  # browser + server + middleware
│  │  ├─ auth.ts                    # requireUser / requireAdmin
│  │  ├─ financial.ts               # regras dos ciclos 03/18
│  │  ├─ queries.ts                 # data layer compartilhado
│  │  ├─ constants.ts               # ALBUM_VALUES, labels
│  │  ├─ validations.ts             # Zod schemas
│  │  └─ utils.ts                   # cn, initials, relativeTime
│  │
│  ├─ server/actions/               # server actions
│  │  ├─ auth.ts                    # signIn, signOut, resetPassword, updatePassword
│  │  ├─ albums.ts                  # CRUD álbuns, problemas, reatribuição
│  │  └─ users.ts
│  │
│  ├─ types/database.ts             # tipos do Supabase
│  └─ middleware.ts                 # proteção de rotas
│
├─ supabase/migrations/
│  ├─ 001_initial_schema.sql        # tabelas, enums, triggers, funções
│  ├─ 002_rls_policies.sql          # RLS e políticas
│  ├─ 003_add_codes.sql             # class_code + student_code
│  └─ 004_open_select_rls.sql       # abre SELECT de álbuns para todos
│
└─ scripts/
   ├─ seed-users.ts
   └─ seed-data.ts
```

## Deploy

### Vercel (recomendado)

1. Push do código para um repo Git (GitHub/GitLab/Bitbucket)
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório
3. Configure as variáveis de ambiente (mesmas do `.env.local`, trocando `NEXT_PUBLIC_APP_URL` pela URL de produção)
4. Deploy

O build roda `next build`. As Server Actions e middleware funcionam automaticamente.

Após o deploy, adicione a URL de produção (ex.: `https://seu-app.vercel.app/api/auth/callback`) em **Authentication → URL Configuration → Redirect URLs** no Supabase.

### Variáveis de ambiente em produção

| Variável                        | Onde                  |
| ------------------------------- | --------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Vercel envs (público) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel envs (público) |
| `SUPABASE_SERVICE_ROLE_KEY`     | Vercel envs (privado) |
| `NEXT_PUBLIC_APP_URL`           | Sua URL final         |

Após o primeiro deploy, rode o seed **localmente** apontando para a base de produção:

```bash
# Aponte .env.local para o projeto Supabase de produção e:
npm run seed
```

---

## Notas de segurança

- Todas as actions sensíveis validam permissões no servidor via `requireUser` / `requireAdmin`.
- RLS no Supabase é a camada final: mesmo se um cliente conseguir burlar o middleware, o banco impede escrita em linhas que ele não possui.
- SELECT de álbuns é aberto para todos os usuários autenticados; INSERT/UPDATE/DELETE permanecem restritos ao próprio responsável ou admin.
- A função `is_admin()` é `SECURITY DEFINER` para evitar recursão de RLS ao consultar a tabela `users` durante a checagem.
- A `service_role` é usada apenas em scripts e nas actions de criação de usuário (`createUserAction`).
- Senhas são gerenciadas inteiramente pelo Supabase Auth (bcrypt server-side). O fluxo de reset usa PKCE — nenhum token trafega em query string visível.

## Licença

Uso interno.
