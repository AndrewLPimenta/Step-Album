import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Gauge,
  Send,
  ShieldAlert,
  Wallet,
} from "@/lib/icons";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  albumEarning,
  buildCycleSummaries,
  computeDiagramadorEarnings,
  getMyGoal,
  isCommissioned,
  listAlbumsForAnalytics,
  type CycleAlbum,
  type UserWithRate,
} from "@/lib/queries";
import {
  MONTH_NAMES_PT,
  computePaymentCycle,
  computePaymentCycleForInstant,
  formatBRL,
  formatDate,
  nowBR,
  toBrazilTime,
  toDateOnly,
} from "@/lib/financial";
import { ALBUM_STATUS_LABELS, ALBUM_TYPE_LABELS } from "@/lib/constants";
import type { AlbumStatus, AlbumType } from "@/types/database";

import { StatCard } from "@/components/dashboard/stat-card";
import { SectionHeader } from "@/components/dashboard/section-header";
import { MetricList, MetricRow } from "@/components/dashboard/metric-list";
import { FlowFunnel, type FlowStep } from "@/components/dashboard/flow-funnel";
import {
  CycleTrendChart,
  RevenueAreaChart,
  StatusDonutChart,
  type CyclePoint,
  type RevenueSeries,
  type StatusSlice,
} from "@/components/dashboard/charts";
import { PaymentAlbumsButton } from "@/components/dashboard/payment-albums-dialog";
import { EmptyState } from "@/components/ui/empty-state";

type Album = Awaited<ReturnType<typeof listAlbumsForAnalytics>>[number];

/** Etapas do fluxo, na ordem em que o trabalho anda. */
const FLOW: { status: AlbumStatus; token: string }[] = [
  { status: "baixado", token: "--status-idle" },
  { status: "editando", token: "--status-active" },
  { status: "montado", token: "--status-assembled" },
  { status: "enviado", token: "--status-sent" },
  { status: "concluido", token: "--status-done" },
];

/** Etapas que ainda dependem de alguem — o "faltam enviar". */
const PENDING: AlbumStatus[] = ["baixado", "editando", "montado"];

const TYPE_TOKEN: Record<AlbumType, string> = {
  medicina: "--type-medicina",
  faculdade: "--type-faculdade",
  colab: "--type-colab",
  especial: "--type-especial",
};

/** Cobre TODOS os status, inclusive fora do fluxo. */
const STATUS_TOKEN: Record<AlbumStatus, string> = {
  baixado: "--status-idle",
  editando: "--status-active",
  montado: "--status-assembled",
  enviado: "--status-sent",
  concluido: "--status-done",
  descartado: "--status-excluded",
  duplicado: "--status-excluded",
  fotos_insuficientes: "--status-problem",
};

function shortDay(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES_PT[d.getMonth()]}`;
}

/** Data em que o album entrou pro caixa: conclusao, ou criacao se nao houver. */
function earnedAt(a: Album): Date {
  return toBrazilTime(new Date(a.completed_at ?? a.created_at));
}

/** Meia-noite local — todo diff de "quantos dias" passa por aqui primeiro. */
function atMidnight(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function daysBetween(a: Date, b: Date) {
  return Math.round(
    (atMidnight(a).getTime() - atMidnight(b).getTime()) / 86_400_000,
  );
}

/** "1 álbum" / "273 álbuns" — plural sem repetir a condicao em cada texto. */
function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default async function DashboardPage() {
  const { profile } = await requireUser();
  const me = profile as UserWithRate;
  const isCriador = profile.role === "criador";
  const firstName = profile.name.split(" ")[0];

  const supabase = await createClient();
  const albums = await listAlbumsForAnalytics();
  const { data: users } = await supabase
    .from("users")
    .select("id, name, role, commission_rate");
  const usersWithRate = (users ?? []) as UserWithRate[];
  const goal = await getMyGoal(profile.id);

  // ---------------------------------------------------------------- ciclos
  const cycle = computePaymentCycleForInstant(new Date());
  const cycleStartKey = toDateOnly(cycle.cycleStart);
  const payKey = toDateOnly(cycle.paymentDate);

  const prevCycle = computePaymentCycle(
    new Date(cycle.cycleStart.getTime() - 86_400_000),
  );
  const prevPayKey = toDateOnly(prevCycle.paymentDate);

  const today = nowBR();
  const turnover = new Date(cycle.cycleEnd);
  turnover.setDate(turnover.getDate() + 1);
  const daysToTurnover = Math.max(0, daysBetween(turnover, today));
  // Dias ja' corridos do ciclo, contando hoje — a base de todo "ritmo" e de
  // toda comparacao justa com o ciclo anterior.
  const daysElapsed = Math.max(1, daysBetween(today, cycle.cycleStart) + 1);

  const isSent = (a: Album) =>
    a.status === "enviado" || a.status === "concluido";
  const mine = albums.filter((a) => a.responsible_id === profile.id);

  const isOwner = isCriador && !isCommissioned(me);
  const earnFor = (a: Album) =>
    isOwner ? Number(a.value) : albumEarning(me, a.type, Number(a.value));

  const scopeAlbums = isCriador ? albums : mine;

  // ------------------------------------------------------------- faturamento
  const cycleSent = scopeAlbums.filter(
    (a) => isSent(a) && a.payment_date === payKey,
  );
  const prevSent = scopeAlbums.filter(
    (a) => isSent(a) && a.payment_date === prevPayKey,
  );
  const cycleRevenue = cycleSent.reduce((s, a) => s + earnFor(a), 0);
  const prevRevenue = prevSent.reduce((s, a) => s + earnFor(a), 0);

  // Comparacao dia-a-dia, nao ciclo-cheio. No dia 2 de um ciclo de 15, medir
  // 2 dias contra 15 rende sempre uma queda de ~85% que nao diz nada sobre
  // desempenho — era o "-77,7%" que o card mostrava em todo inicio de ciclo.
  // Aqui o ciclo anterior e' recortado na MESMA quantidade de dias corridos.
  const prevSameWindow = prevSent.filter(
    (a) => daysBetween(earnedAt(a), prevCycle.cycleStart) < daysElapsed,
  );
  const prevWindowRevenue = prevSameWindow.reduce(
    (s, a) => s + earnFor(a),
    0,
  );
  const delta =
    prevWindowRevenue > 0
      ? (cycleRevenue - prevWindowRevenue) / prevWindowRevenue
      : null;

  const myCycleSent = mine.filter(
    (a) => isSent(a) && a.payment_date === payKey,
  );
  const myCycleRevenue = myCycleSent.reduce((s, a) => s + earnFor(a), 0);

  // --------------------------------------------------------- ciclo em aberto
  const inCycle = scopeAlbums.filter(
    (a) => a.cycle_start === cycleStartKey && a.status !== "descartado",
  );
  const pending = inCycle.filter((a) =>
    PENDING.includes(a.status as AlbumStatus),
  );
  const pendingByStatus = PENDING.map((s) => ({
    status: s,
    count: pending.filter((a) => a.status === s).length,
  })).filter((x) => x.count > 0);
  const bottleneck = [...pendingByStatus].sort((a, b) => b.count - a.count)[0];

  const flow: FlowStep[] = FLOW.map((f) => ({
    ...f,
    label: ALBUM_STATUS_LABELS[f.status],
    count: inCycle.filter((a) => a.status === f.status).length,
  }));

  // ------------------------------------------------------------------ ritmo
  // Enviados por dia ate' agora contra quantos por dia seriam necessarios pra
  // zerar a pendencia antes da virada. Os dois numeros juntos sao a unica
  // leitura que diz se o ciclo fecha — nenhum dos dois sozinho diz.
  const sentThisCycle = inCycle.filter(isSent).length;
  const paceActual = sentThisCycle / daysElapsed;
  const paceNeeded = daysToTurnover > 0 ? pending.length / daysToTurnover : 0;
  const projected = Math.round(paceActual * daysToTurnover);
  const carryOver = Math.max(0, pending.length - projected);

  const byType = (Object.keys(TYPE_TOKEN) as AlbumType[])
    .map((t) => {
      const rows = inCycle.filter((a) => a.type === t);
      return {
        type: t,
        label: ALBUM_TYPE_LABELS[t],
        token: TYPE_TOKEN[t],
        count: rows.length,
        total: rows.reduce((s, a) => s + earnFor(a), 0),
      };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.total - a.total);
  const typeMax = Math.max(1, ...byType.map((t) => t.total));

  // ------------------------------------------------------------------- meta
  const goalValue =
    goal && goal.goal_type === "valor" ? Number(goal.goal_value) : null;
  const goalPct = goalValue ? Math.min(1, myCycleRevenue / goalValue) : null;
  const goalMissing = goalValue
    ? Math.max(0, goalValue - myCycleRevenue)
    : null;

  // ---------------------------------------------------- serie do grafico
  function series(
    key: string,
    tab: string,
    rows: Album[],
    from: Date,
    to: Date,
    period: string,
  ): RevenueSeries {
    const byDay = new Map<string, number>();
    for (const a of rows) {
      const k = toDateOnly(earnedAt(a));
      byDay.set(k, (byDay.get(k) ?? 0) + earnFor(a));
    }
    const points: RevenueSeries["points"] = [];
    const cursor = new Date(from);
    let acc = 0;
    for (let i = 0; cursor <= to && i < 400; i++) {
      acc += byDay.get(toDateOnly(cursor)) ?? 0;
      points.push({
        label:
          i === 0 || cursor.getDate() === 1
            ? shortDay(cursor)
            : String(cursor.getDate()).padStart(2, "0"),
        value: acc,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    if (points.length) {
      const lastDate = new Date(to);
      points[points.length - 1].label = shortDay(lastDate);
    }
    return { key, tab, period, total: acc, goal: goalValue, points };
  }

  const cycleTo = today < cycle.cycleEnd ? today : cycle.cycleEnd;
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthSent = scopeAlbums.filter(
    (a) => isSent(a) && earnedAt(a) >= monthStart,
  );

  const revenueSeries: RevenueSeries[] = [
    series(
      "ciclo",
      "Ciclo",
      cycleSent,
      cycle.cycleStart,
      cycleTo,
      `${String(cycle.cycleStart.getDate()).padStart(2, "0")} — ${shortDay(cycle.cycleEnd)}`,
    ),
    series(
      "anterior",
      "Anterior",
      prevSent,
      prevCycle.cycleStart,
      prevCycle.cycleEnd,
      `${String(prevCycle.cycleStart.getDate()).padStart(2, "0")} — ${shortDay(prevCycle.cycleEnd)}`,
    ),
    series(
      "mes",
      "Mês",
      monthSent,
      monthStart,
      today,
      `${MONTH_NAMES_PT[today.getMonth()]} ${today.getFullYear()}`,
    ),
  ];

  // -------------------------------------------------- proximos pagamentos
  const userName = new Map((users ?? []).map((u) => [u.id, u.name]));
  const payments = new Map<
    string,
    {
      total: number;
      count: number;
      albums: {
        id: string;
        student_name: string;
        class_code: string | null;
        type: AlbumType;
        status: AlbumStatus;
        value: number;
        responsibleName: string;
      }[];
    }
  >();
  for (const a of scopeAlbums) {
    if (!a.payment_date || !isSent(a)) continue;
    if (a.payment_date < toDateOnly(today)) continue;
    const cur = payments.get(a.payment_date) ?? {
      total: 0,
      count: 0,
      albums: [],
    };
    cur.total += earnFor(a);
    cur.count += 1;
    cur.albums.push({
      id: a.id,
      student_name: a.student_name,
      class_code: a.class_code,
      type: a.type,
      status: a.status,
      value: earnFor(a),
      responsibleName: userName.get(a.responsible_id) ?? "Desconhecido",
    });
    payments.set(a.payment_date, cur);
  }
  const nextPayments = Array.from(payments.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const nextPaymentsTotal = nextPayments.reduce((s, p) => s + p.total, 0);

  // ------------------------------------------------------------- problemas
  const openProblemsBase = supabase
    .from("album_problems")
    .select("album_id", { count: "exact", head: true })
    .eq("resolved", false);
  const { count: openProblemsRaw } = await (isCriador
    ? openProblemsBase
    : openProblemsBase.in("album_id", mine.map((a) => a.id)));
  const openProblems = openProblemsRaw ?? 0;

  // --------------------------------------------------- por diagramador
  const byUser = isCriador
    ? Array.from(
        inCycle.reduce((m, a) => {
          m.set(a.responsible_id, (m.get(a.responsible_id) ?? 0) + 1);
          return m;
        }, new Map<string, number>()),
      )
        .map(([id, count]) => ({
          name: userName.get(id) ?? "Desconhecido",
          count,
        }))
        .sort((a, b) => b.count - a.count)
    : [];
  const byUserMax = Math.max(1, ...byUser.map((u) => u.count));
  const topUser = byUser[0];
  const topUserShare =
    topUser && inCycle.length > 0
      ? Math.round((topUser.count / inCycle.length) * 100)
      : 0;

  const sentAll = scopeAlbums.filter(
    (a) => isSent(a) && a.payment_date,
  ) as unknown as CycleAlbum[];

  const diagramadorEarnings = isCriador
    ? computeDiagramadorEarnings(sentAll, usersWithRate)
    : [];
  const diagramadorEarningsMax = Math.max(
    1,
    ...diagramadorEarnings.map((u) => u.earnings),
  );

  // -------------------------------------------------- tendencia de ciclos
  const cycleSummaries = buildCycleSummaries(
    sentAll,
    usersWithRate,
    today,
  ).reverse();
  const trendPoints: CyclePoint[] = cycleSummaries.map((s) => ({
    key: s.paymentDate,
    label: shortDay(new Date(`${s.paymentDate}T12:00:00`)),
    value: isCriador
      ? s.total
      : (s.byUser.find((u) => u.userId === profile.id)?.earnings ?? 0),
    isCurrent: s.paymentDate === payKey,
  }));
  // Compara os dois ultimos ciclos JA' FECHADOS — incluir o corrente, que
  // esta' pela metade, inverteria o sinal em todo comeco de quinzena.
  const closed = trendPoints.filter((p) => !p.isCurrent);
  const lastClosed = closed[closed.length - 1];
  const beforeLast = closed[closed.length - 2];
  const trendPct =
    lastClosed && beforeLast && beforeLast.value > 0
      ? Math.round(
          ((lastClosed.value - beforeLast.value) / beforeLast.value) * 100,
        )
      : null;

  // ------------------------------------------- distribuicao por status
  const statusCounts = new Map<AlbumStatus, number>();
  for (const a of scopeAlbums) {
    const s = a.status as AlbumStatus;
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  }
  const statusDistribution: StatusSlice[] = Array.from(statusCounts.entries())
    .map(([status, value]) => ({
      key: status,
      label: ALBUM_STATUS_LABELS[status],
      value,
      token: STATUS_TOKEN[status],
    }))
    .sort((a, b) => b.value - a.value);

  const problemShare =
    scopeAlbums.length > 0
      ? Math.round((openProblems / scopeAlbums.length) * 100)
      : 0;

  return (
    <div className="space-y-10 pb-4">
      {/* ------------------------------------------------------------ capa */}
      <header className="animate-slide-up">
        <p className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground/60">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "hsl(var(--success))" }}
            aria-hidden="true"
          />
          <span>Ciclo {cycle.label}</span>
          <span aria-hidden="true" className="text-muted-foreground/30">
            ·
          </span>
          <span>Dia {daysElapsed} de {daysElapsed + daysToTurnover}</span>
          <span aria-hidden="true" className="text-muted-foreground/30">
            ·
          </span>
          <span>Pagamento em {formatDate(cycle.paymentDate)}</span>
          <span aria-hidden="true" className="text-muted-foreground/30">
            ·
          </span>
          <span>{isCriador ? "Equipe" : "Seus álbuns"}</span>
        </p>

        <h1 className="mt-3 max-w-[22ch] font-display text-[2.1rem] font-semibold leading-[1.06] tracking-tight sm:text-[2.75rem]">
           Olá, <span style={{ color: "hsl(var(--ink-amber))" }}> {firstName}.{" "}</span>
        </h1>

        {/* A leitura em prosa. E' o que o painel dizia so' em grafico: o
            estado do ciclo, o ritmo, a projecao e onde esta' o acumulo. */}
        <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">
          {pending.length > 0 ? (
            <>
              Faltam{" "}
              <span style={{ color: "hsl(var(--ink-amber))" }}>
                {plural(pending.length, "álbum", "álbuns")}
              </span>{" "}
              para fechar o ciclo.
            </>
          ) : (
            <>Ciclo em dia — nada pendente de envio.</>
          )}
        </p>
      </header>

      {/* ------------------------------------------------------------ KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={isCriador ? "Faturamento da equipe" : "Seu faturamento"}
          value={formatBRL(cycleRevenue)}
          icon={Wallet}
          href="/financial"
          spark={revenueSeries[0].points.map((p) => p.value)}
          trend={
            delta === null
              ? undefined
              : {
                  value: `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`,
                  positive: delta >= 0,
                }
          }
          description={
            delta === null
              ? `${plural(cycleSent.length, "envio", "envios")} neste ciclo`
              : `vs. mesmos ${daysElapsed}d do ciclo anterior`
          }
          footnote={
            prevRevenue > 0
              ? `${plural(cycleSent.length, "envio", "envios")} · ciclo anterior fechou em ${formatBRL(prevRevenue)}`
              : `${plural(cycleSent.length, "envio", "envios")} no ciclo`
          }
        />

        <StatCard
          title="Faltam enviar"
          value={pending.length}
          unit={pending.length === 1 ? "álbum" : "álbuns"}
          icon={Send}
          href="/fila"
          description={
            daysToTurnover > 0
              ? `${plural(daysToTurnover, "dia", "dias")} até a virada`
              : "a virada é hoje"
          }
          footnote={
            pendingByStatus.length
              ? pendingByStatus
                  .map(
                    (p) =>
                      `${p.count} ${ALBUM_STATUS_LABELS[p.status].toLowerCase()}`,
                  )
                  .join(" · ")
              : "Nada pendente neste ciclo"
          }
        />

        {/* Substituiu o antigo "Tipos no ciclo". Aquele card respondia
            "quantos tipos diferentes existem" — um numero que fica em 1 por
            meses e nao muda nenhuma decisao. */}
        <StatCard
          title="Ritmo necessário"
          value={daysToTurnover > 0 ? Math.ceil(paceNeeded) : pending.length}
          unit={daysToTurnover > 0 ? "por dia" : "hoje"}
          accent="amber"
          icon={Gauge}
          href="/fila"
          description={`${paceActual.toFixed(1)}/dia no ritmo atual`}
          footnote={
            daysToTurnover > 0
              ? paceActual >= paceNeeded
                ? "No ritmo atual o ciclo fecha zerado."
                : `Faltam ${(paceNeeded - paceActual).toFixed(1)}/dia para zerar até ${shortDay(turnover)}.`
              : `Tudo que não sair hoje atravessa para o ciclo seguinte.`
          }
        />

        <StatCard
          title="Problemas em aberto"
          value={openProblems}
          unit={openProblems === 1 ? "álbum" : "álbuns"}
          accent="amber"
          icon={ShieldAlert}
          href="/albums?problems=yes"
          description={
            openProblems > 0 ? `${problemShare}% da base` : "nada pendente"
          }
          footnote={
            openProblems > 0
              ? "Fotos insuficientes, duplicados e erros de download ainda sem resolução."
              : "Nenhum álbum com problema registrado."
          }
        />
      </div>

      {/* -------------------------------------------------- 01 faturamento */}
      <section aria-labelledby="sec-faturamento">
        <SectionHeader
          index="01"
          kicker="Faturamento"
          headline={
            <span id="sec-faturamento">
              {cycleRevenue > 0 ? (
                <>
                  {formatBRL(cycleRevenue)} garantidos nos primeiros{" "}
                  {plural(daysElapsed, "dia", "dias")} do ciclo.
                </>
              ) : (
                <>Nenhum envio entrou no caixa deste ciclo ainda.</>
              )}
            </span>
          }
          lede={
            delta !== null ? (
              <>
                A comparação é com os <strong>mesmos {daysElapsed} dias</strong>{" "}
                do ciclo anterior ({formatBRL(prevWindowRevenue)}), não com o
                ciclo fechado — medir dois dias contra quinze produziria uma
                queda que só reflete o calendário.
              </>
            ) : (
              <>
                O ciclo anterior não teve envios nesta mesma janela de dias, então
                não há base de comparação — a curva abaixo mostra o acumulado
                bruto.
              </>
            )
          }
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <RevenueAreaChart
            series={revenueSeries}
            description={
              isCriador
                ? "Todos os álbuns da equipe enviados ou concluídos."
                : "Somente os seus álbuns enviados ou concluídos."
            }
            emptyHint={
              isCriador
                ? "Nenhum álbum da equipe foi enviado neste período — a curva aparece quando o primeiro envio entrar."
                : "Nenhum álbum seu foi enviado neste período — a curva aparece quando o primeiro envio entrar."
            }
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {/* Meta pessoal */}
            <section className="glass relative overflow-hidden p-5">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 -right-12 h-44 w-44 rounded-full"
                style={{
                  background:
                    "radial-gradient(closest-side, hsl(var(--brand-amber) / 0.2), transparent)",
                }}
              />
              <h3 className="relative text-base font-semibold tracking-tight">
                Meta pessoal
              </h3>
              <p className="relative mt-1 text-sm text-muted-foreground">
                Valor a receber no fechamento
              </p>

              {goalValue ? (
                <>
                  <p className="relative mt-4 flex items-baseline gap-2 font-display text-[1.9rem] font-semibold leading-none tracking-tight tabular-nums">
                    {formatBRL(myCycleRevenue)}
                    <span className="text-sm font-medium text-muted-foreground">
                      de {formatBRL(goalValue)}
                    </span>
                  </p>
                  <div className="progress-track relative mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--chip)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(goalPct ?? 0) * 100}%`,
                        background:
                          "linear-gradient(90deg, hsl(var(--brand-blue)), hsl(var(--brand-amber)))",
                      }}
                    />
                  </div>
                  <p className="relative mt-2.5 text-xs text-muted-foreground">
                    {Math.round((goalPct ?? 0) * 100)}%
                    {goalMissing && goalMissing > 0
                      ? ` · faltam ${formatBRL(goalMissing)}`
                      : " · meta batida"}
                  </p>
                </>
              ) : (
                <Link
                  href="/metas"
                  className="focus-ring relative mt-4 inline-flex items-center gap-1.5 rounded text-sm font-medium text-[hsl(var(--ink-blue))] hover:underline"
                >
                  Definir uma meta
                  <ArrowRight className="h-3.5 w-3.5" weight="regular" />
                </Link>
              )}
            </section>

            {/* Proximos pagamentos */}
            <section className="glass p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold tracking-tight">
                  Próximos pagamentos
                </h3>
                {nextPaymentsTotal > 0 && (
                  <span className="font-display text-sm font-semibold tabular-nums">
                    {formatBRL(nextPaymentsTotal)}
                  </span>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {nextPayments.length === 0 && (
                  <EmptyState
                    icon={CalendarClock}
                    title="Nenhum pagamento previsto"
                    description="Álbuns marcados como enviados aparecem aqui com a data de pagamento."
                    className="border-0 py-6 shadow-none"
                  />
                )}
                {nextPayments.map((p, i) => (
                  <div
                    key={p.date}
                    className="glass-chip flex items-center justify-between rounded-xl px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background:
                            i === 0
                              ? "hsl(var(--brand-blue))"
                              : "hsl(var(--brand-amber))",
                        }}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="text-sm font-medium">
                          {formatDate(p.date)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {plural(p.count, "álbum", "álbuns")}
                          <PaymentAlbumsButton
                            date={p.date}
                            total={p.total}
                            count={p.count}
                            albums={p.albums}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="font-display text-base font-semibold tabular-nums">
                      {formatBRL(p.total)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- 02 producao */}
      <section aria-labelledby="sec-producao">
        <SectionHeader
          index="02"
          kicker="Produção"
          headline={
            <span id="sec-producao">
              {bottleneck ? (
                <>
                  O funil trava em{" "}
                  {ALBUM_STATUS_LABELS[bottleneck.status].toLowerCase()}:{" "}
                  {plural(bottleneck.count, "álbum parado", "álbuns parados")}.
                </>
              ) : (
                <>Nada parado no funil deste ciclo.</>
              )}
            </span>
          }
          lede={
            <>
              As cinco etapas dos {plural(inCycle.length, "álbum", "álbuns")}{" "}
              cujo ciclo de início é o atual. A porcentagem sob cada etapa é
              quanto do passo anterior já chegou nela — é onde a fila deixa de
              andar.
            </>
          }
          right={
            openProblems > 0 ? (
              <Link
                href="/albums?problems=yes"
                className="glass-chip glass-interactive focus-ring inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium"
              >
                <AlertTriangle
                  className="h-4 w-4 text-[hsl(var(--status-problem))]"
                  weight="duotone"
                  aria-hidden="true"
                />
                {plural(openProblems, "problema", "problemas")} em aberto
                <ArrowRight className="h-3.5 w-3.5" weight="regular" />
              </Link>
            ) : null
          }
        />

        <FlowFunnel steps={flow} />

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="glass p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-semibold tracking-tight">
                Tipos de álbum
              </h3>
              <span className="eyebrow text-muted-foreground">Ciclo atual</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Contagem e valor bruto lado a lado — sem o valor, “14 colabs” e
              “9 especiais” parecem equivalentes.
            </p>
            <MetricList className="mt-3">
              {byType.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Nenhum álbum neste ciclo ainda.
                </p>
              )}
              {byType.map((t) => (
                <MetricRow
                  key={t.type}
                  label={t.label}
                  token={t.token}
                  ratio={t.total / typeMax}
                  note={`${t.count} álb.`}
                  value={formatBRL(t.total)}
                />
              ))}
            </MetricList>
          </section>

          <StatusDonutChart
            data={statusDistribution}
            description={`Todo o histórico: ${plural(scopeAlbums.length, "álbum", "álbuns")}, incluindo o ciclo atual.`}
          />
        </div>
      </section>

      {/* ------------------------------------------------------- 03 equipe */}
      {isCriador && byUser.length > 0 && (
        <section aria-labelledby="sec-equipe">
          <SectionHeader
            index="03"
            kicker="Equipe"
            headline={
              <span id="sec-equipe">
                {topUser ? (
                  <>
                    {topUser.name.split(" ")[0]} carrega {topUserShare}% da fila
                    do ciclo.
                  </>
                ) : (
                  <>Nenhum álbum atribuído neste ciclo.</>
                )}
              </span>
            }
            lede={
              <>
                À esquerda, carga de trabalho do ciclo aberto (qualquer status).
                À direita, comissão acumulada em todo o histórico de envios — são
                recortes diferentes de propósito: quem tem mais fila agora não é
                necessariamente quem mais recebeu.
              </>
            }
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="glass p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold tracking-tight">
                  Carga do ciclo
                </h3>
                <span className="eyebrow text-muted-foreground">
                  {plural(inCycle.length, "álbum", "álbuns")}
                </span>
              </div>
              <MetricList className="mt-3">
                {byUser.map((u) => (
                  <MetricRow
                    key={u.name}
                    label={u.name}
                    ratio={u.count / byUserMax}
                    token="--brand-blue"
                    note={`${Math.round((u.count / Math.max(1, inCycle.length)) * 100)}%`}
                    value={String(u.count)}
                  />
                ))}
              </MetricList>
            </section>

            {diagramadorEarnings.length > 0 && (
              <section className="glass p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight">
                    Comissão acumulada
                  </h3>
                  <span className="eyebrow text-muted-foreground">
                    Histórico
                  </span>
                </div>
                <MetricList className="mt-3">
                  {diagramadorEarnings.map((u) => (
                    <MetricRow
                      key={u.userId}
                      label={u.name}
                      ratio={u.earnings / diagramadorEarningsMax}
                      token="--brand-amber"
                      note={`${u.count} álb.`}
                      value={formatBRL(u.earnings)}
                    />
                  ))}
                </MetricList>
              </section>
            )}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- 04 historico */}
      <section aria-labelledby="sec-historico">
        <SectionHeader
          index={isCriador && byUser.length > 0 ? "04" : "03"}
          kicker="Histórico"
          headline={
            <span id="sec-historico">
              {trendPct === null ? (
                <>Ainda não há dois ciclos fechados para comparar.</>
              ) : trendPct >= 0 ? (
                <>
                  O último ciclo fechado subiu {trendPct}% sobre o anterior.
                </>
              ) : (
                <>
                  O último ciclo fechado caiu {Math.abs(trendPct)}% sobre o
                  anterior.
                </>
              )}
            </span>
          }
          lede={
            isCriador
              ? "Receita bruta da organização em cada ciclo de pagamento, do mais antigo ao atual. A última barra é o ciclo aberto e ainda vai crescer."
              : "Seus ganhos em cada ciclo de pagamento, do mais antigo ao atual. A última barra é o ciclo aberto e ainda vai crescer."
          }
        />

        <CycleTrendChart
          points={trendPoints}
          description={
            isCriador
              ? "Receita bruta da organização em todos os ciclos, do mais antigo ao atual."
              : "Seus ganhos em todos os ciclos, do mais antigo ao atual."
          }
        />
      </section>
    </div>
  );
}
