import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Copy, FolderOpen, ImageOff, type AppIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { ALBUM_STATUS_LABELS } from "@/lib/constants";
import type { AlbumStatus, AlbumType, UserRow } from "@/types/database";
import { FilaQueue } from "@/components/fila/fila-queue";
import {
  WorkloadCard,
  type WorkloadSlice,
} from "@/components/fila/workload-card";
import {
  computePaymentCycleForInstant,
  formatDate,
  toDateOnly,
} from "@/lib/financial";
import { EmptyState } from "@/components/ui/empty-state";

type ActiveStatus = Extract<
  AlbumStatus,
  "baixado" | "descartado" | "editando" | "montado" | "enviado"
>;

/** Ordem do fluxo + a cor de cada etapa, fonte unica em globals.css. */
const ACTIVE_FLOW: { status: ActiveStatus; token: string }[] = [
  { status: "baixado", token: "--status-idle" },
  { status: "editando", token: "--status-active" },
  { status: "montado", token: "--status-assembled" },
  { status: "enviado", token: "--status-sent" },
  { status: "descartado", token: "--status-excluded" },
];

interface UserStats {
  baixado: number;
  descartado: number;
  editando: number;
  montado: number;
  enviado: number;
  total: number;
}

const ZERO: UserStats = {
  baixado: 0,
  descartado: 0,
  editando: 0,
  montado: 0,
  enviado: 0,
  total: 0,
};

type QueueAlbum = {
  id: string;
  student_name: string;
  class_code: string | null;
  student_code: string | null;
  faculty: string;
  type: AlbumType;
  status: AlbumStatus;
  responsible_id: string;
  created_at: string;
  kaz_id: string | null;
};

export default async function FilaPage() {
  const { profile } = await requireUser();
  const isCriador = profile.role === "criador";

  const supabase = await createClient();

  const currentCycle = computePaymentCycleForInstant(new Date());
  const currentCycleStart = toDateOnly(currentCycle.cycleStart);

  const [albumsRes, usersRes] = await Promise.all([
    supabase
      .from("albums")
      .select(
        "id, student_name, class_code, student_code, faculty, type, status, responsible_id, created_at, kaz_id, cycle_start",
      )
      .neq("status", "concluido")
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("id, name, active")
      .eq("active", true)
      .order("name"),
  ]);

  // Strictly the current cycle only — nothing older than 18/7 → 3/8 shows
  // here. Unfinished work stuck in a past cycle (cycle_start never moves
  // while status sits in baixado/editando/montado) gets carried into the
  // current cycle one hop at a time by the daily cron job instead of being
  // pulled in at query time — see /api/cron/cleanup-inutilizaveis.
  const rawAlbums = (albumsRes.data ?? []) as (QueueAlbum & {
    cycle_start: string | null;
  })[];
  const allAlbums = rawAlbums.filter((a) => a.cycle_start === currentCycleStart);
  const users = (usersRes.data ?? []) as Pick<
    UserRow,
    "id" | "name" | "active"
  >[];

  const inutilizavelStatuses = new Set<AlbumStatus>([
    "fotos_insuficientes",
    "duplicado",
  ]);
  const activeAlbums = allAlbums.filter(
    (a) => !inutilizavelStatuses.has(a.status),
  );
  const inutilizaveis = allAlbums.filter((a) =>
    inutilizavelStatuses.has(a.status),
  );
  const fotosInsuf = inutilizaveis.filter(
    (a) => a.status === "fotos_insuficientes",
  );
  const copias = inutilizaveis.filter((a) => a.status === "duplicado");

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  // Per-user stats (only active albums)
  const userStats = new Map<string, UserStats>();
  for (const u of users) userStats.set(u.id, { ...ZERO });
  for (const a of activeAlbums) {
    const s = userStats.get(a.responsible_id) ?? { ...ZERO };
    s.total += 1;
    const st = a.status as ActiveStatus;
    if (st in s) s[st] += 1;
    userStats.set(a.responsible_id, s);
  }

  const selectUsers = users.map((u) => ({ id: u.id, name: u.name }));

  // Não-criadores só veem os próprios álbuns (já garantido pelo RLS) — os
  // cartões de carga de trabalho seguem a mesma regra, mostrando só o deles.
  const visibleUsers = isCriador
    ? users
    : users.filter((u) => u.id === profile.id);

  const withWork = visibleUsers
    .map((u) => ({ user: u, stats: userStats.get(u.id) ?? ZERO }))
    .filter((r) => r.stats.total > 0)
    .sort((a, b) => b.stats.total - a.stats.total);

  // Quem esta' sem fila nao ganha um card do mesmo tamanho de quem tem 210
  // albuns — vira uma linha. A grade antiga dava peso igual a "0" e a "210",
  // e sobrava um buraco no meio quando o numero de pessoas nao era multiplo
  // de quatro.
  const idle = visibleUsers.filter(
    (u) => (userStats.get(u.id) ?? ZERO).total === 0,
  );

  const busiest = withWork[0];
  const busiestShare =
    busiest && activeAlbums.length > 0
      ? Math.round((busiest.stats.total / activeAlbums.length) * 100)
      : 0;

  function slicesFor(stats: UserStats): WorkloadSlice[] {
    return ACTIVE_FLOW.map((f) => ({
      status: f.status as AlbumStatus,
      count: stats[f.status],
      token: f.token,
    })).filter((s) => s.count > 0);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow flex flex-wrap items-center gap-x-2 text-muted-foreground/60">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "hsl(var(--success))" }}
            aria-hidden="true"
          />
          Ciclo {currentCycle.label}
          <span aria-hidden="true" className="text-muted-foreground/30">
            ·
          </span>
          Pagamento em {formatDate(currentCycle.paymentDate)}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Fila de trabalho
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-sm text-muted-foreground">
          {activeAlbums.length === 0 ? (
            <>Nenhum álbum em andamento neste ciclo.</>
          ) : (
            <>
              {activeAlbums.length} álbu
              {activeAlbums.length === 1 ? "m" : "ns"} em andamento
              {busiest && isCriador ? (
                <>
                  , {busiestShare}% deles com {busiest.user.name.split(" ")[0]}
                </>
              ) : null}
              . Só entram aqui os álbuns cujo ciclo de início é o atual.
            </>
          )}
        </p>
      </header>

      {/* Carga por pessoa */}
      {withWork.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {withWork.map(({ user, stats }) => (
            <WorkloadCard
              key={user.id}
              name={user.name}
              total={stats.total}
              slices={slicesFor(stats)}
            />
          ))}
        </div>
      )}

      {idle.length > 0 && (
        <p className="glass-chip flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3.5 py-2.5 text-xs text-muted-foreground">
          <span className="eyebrow text-muted-foreground/55">Sem fila</span>
          <span>{idle.map((u) => u.name).join(" · ")}</span>
        </p>
      )}

      {/* Active queue */}
      {activeAlbums.length > 0 ? (
        <FilaQueue albums={activeAlbums} users={selectUsers} />
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="Fila vazia"
          // Nomear a data do ciclo importa: a fila filtra por cycle_start ===
          // ciclo atual, entao sem ela "vazia" nao diz de QUAL recorte se
          // esta' falando.
          description={`Nenhum álbum em andamento no ciclo iniciado em ${formatDate(currentCycle.cycleStart)}. Novos álbuns aparecem aqui assim que forem criados.`}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/albums">Ver todos os álbuns</Link>
            </Button>
          }
          className="py-16"
        />
      )}

      {/* Inutilizaveis. As cores vem dos tokens de status (--status-problem /
          --status-excluded), nao de utilitarios soltos do Tailwind (orange / slate): sao
          os mesmos status que a tabela e os badges pintam, e ter dois mapas
          de cor pro mesmo status foi exatamente o bug que a fonte unica em
          constants.ts resolveu. */}
      <InutilizavelGroup
        icon={ImageOff}
        token="--status-problem"
        title={ALBUM_STATUS_LABELS.fotos_insuficientes}
        note="não irão para a fila de eventos · removidos ao fim do ciclo"
        rows={fotosInsuf}
        userMap={userMap}
      />
      <InutilizavelGroup
        icon={Copy}
        token="--status-excluded"
        title={ALBUM_STATUS_LABELS.duplicado}
        note="removidos ao fim do ciclo"
        rows={copias}
        userMap={userMap}
      />
    </div>
  );
}

function InutilizavelGroup({
  icon: Icon,
  token,
  title,
  note,
  rows,
  userMap,
}: {
  icon: AppIcon;
  token: string;
  title: string;
  note: string;
  rows: (QueueAlbum & { cycle_start: string | null })[];
  userMap: Map<string, string>;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: `hsl(var(${token}))` }} />
        <h2
          className="text-sm font-semibold"
          style={{ color: `hsl(var(${token}))` }}
        >
          {title}
        </h2>
        <span className="text-xs text-muted-foreground">
          ({rows.length}) — {note}
        </span>
      </div>
      <div className="glass overflow-hidden rounded-2xl">
        <div className="divide-y divide-[var(--brd)]">
          {rows.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: `hsl(var(${token}))` }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.student_name}</p>
                <p className="text-xs text-muted-foreground">
                  {userMap.get(a.responsible_id) ?? "—"}
                  {a.class_code && (
                    <span className="ml-1 opacity-60">· {a.class_code}</span>
                  )}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {a.faculty}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
