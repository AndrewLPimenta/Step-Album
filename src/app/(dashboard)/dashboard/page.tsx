import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Layers,
  Send,
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
import {
  ALBUM_STATUS_LABELS,
  ALBUM_TYPE_LABELS,
} from "@/lib/constants";
import type { AlbumStatus, AlbumType } from "@/types/database";

import { StatCard } from "@/components/dashboard/stat-card";
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

/** Cobre TODOS os status, inclusive fora do fluxo — a rosca mostra proporcao
    de tudo que esta' no ciclo, nao so' as 5 etapas normais. */
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

  // Um dia antes do inicio do ciclo atual cai, por definicao, no ciclo
  // anterior — e' assim que se acha o par de comparacao sem repetir a regra.
  const prevCycle = computePaymentCycle(
    new Date(cycle.cycleStart.getTime() - 86_400_000),
  );
  const prevPayKey = toDateOnly(prevCycle.paymentDate);

  const today = nowBR();
  // O ciclo vira a 00:00 do dia SEGUINTE ao dia de fronteira (03/18), que e'
  // exatamente o cycleEnd — o dia de fronteira ainda pertence ao ciclo velho.
  const turnover = new Date(cycle.cycleEnd);
  turnover.setDate(turnover.getDate() + 1);
  const daysToTurnover = Math.max(
    0,
    Math.ceil((turnover.getTime() - today.getTime()) / 86_400_000),
  );

  const isSent = (a: Album) =>
    a.status === "enviado" || a.status === "concluido";
  const mine = albums.filter((a) => a.responsible_id === profile.id);

  // "Dono" (criador sem commission_rate) recebe o valor cheio do album,
  // comissionado recebe o repasse fixo — mesma regra do /financial.
  const isOwner = isCriador && !isCommissioned(me);
  const earnFor = (a: Album) =>
    isOwner ? Number(a.value) : albumEarning(me, a.type, Number(a.value));

  // Criador ve' a receita de TODA a equipe (RLS ja' devolve todos os albuns
  // pra criador); admin/diagramador ve' so' os proprios — RLS ja' limita
  // `albums` aos proprios registros nesse caso, entao scopeAlbums == mine.
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
  const delta =
    prevRevenue > 0 ? (cycleRevenue - prevRevenue) / prevRevenue : null;

  // Meta pessoal e' sempre do PROPRIO usuario, mesmo pro criador (que pode
  // ter --ou nao-- albuns proprios atribuidos) — nunca a receita da equipe,
  // entao usa sempre `mine`, nunca `scopeAlbums`.
  const myCycleSent = mine.filter(
    (a) => isSent(a) && a.payment_date === payKey,
  );
  const myCycleRevenue = myCycleSent.reduce((s, a) => s + earnFor(a), 0);

  // --------------------------------------------------------- ciclo em aberto
  // cycle_start e' o campo autoritativo de "a que ciclo este album pertence"
  // (o cron carrega trabalho parado pro ciclo corrente, um salto por vez).
  const inCycle = albums.filter(
    (a) => a.cycle_start === cycleStartKey && a.status !== "descartado",
  );
  const pending = inCycle.filter((a) =>
    PENDING.includes(a.status as AlbumStatus),
  );
  const pendingByStatus = PENDING.map((s) => ({
    status: s,
    count: pending.filter((a) => a.status === s).length,
  })).filter((x) => x.count > 0);

  const flow = FLOW.map((f) => ({
    ...f,
    label: ALBUM_STATUS_LABELS[f.status],
    count: inCycle.filter((a) => a.status === f.status).length,
  }));
  const flowMax = Math.max(1, ...flow.map((f) => f.count));

  const byType = (Object.keys(TYPE_TOKEN) as AlbumType[])
    .map((t) => {
      const rows = inCycle.filter((a) => a.type === t);
      return {
        type: t,
        label: ALBUM_TYPE_LABELS[t],
        token: TYPE_TOKEN[t],
        count: rows.length,
        total: rows.reduce((s, a) => s + Number(a.value), 0),
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
    // Guarda de 400 iteracoes: se from/to vierem invertidos por algum dado
    // estranho, o loop para em vez de travar a pagina.
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
    return {
      key,
      tab,
      period,
      total: acc,
      goal: goalValue,
      points,
    };
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
  for (const a of albums) {
    if (!a.payment_date || !isSent(a)) continue;
    if (a.payment_date < toDateOnly(today)) continue;
    const cur = payments.get(a.payment_date) ?? {
      total: 0,
      count: 0,
      albums: [],
    };
    cur.total += Number(a.value);
    cur.count += 1;
    cur.albums.push({
      id: a.id,
      student_name: a.student_name,
      class_code: a.class_code,
      type: a.type,
      status: a.status,
      value: Number(a.value),
      responsibleName: userName.get(a.responsible_id) ?? "Desconhecido",
    });
    payments.set(a.payment_date, cur);
  }
  const nextPayments = Array.from(payments.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  // ------------------------------------------------------------- problemas
  const { count: openProblems } = await supabase
    .from("album_problems")
    .select("album_id", { count: "exact", head: true })
    .eq("resolved", false);

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

  // sentAll: todo o historico de envios (nao so' o ciclo atual), no escopo
  // de quem esta' olhando — criador ve' o da equipe inteira, os demais so'
  // o proprio (RLS ja' garante isso pra `albums`, `scopeAlbums` so' deixa
  // explicito). Base dos tres widgets "historico" abaixo — nenhum deles
  // deve se prender so' ao ciclo atual.
  const sentAll = scopeAlbums.filter(
    (a) => isSent(a) && a.payment_date,
  ) as unknown as CycleAlbum[];

  // ---------------------------------------------- receita por diagramador
  // Ganhos acumulados de CADA pessoa em toda a historia, nao so' o ciclo
  // atual — separado do "Por diagramador" acima, que e' carga de trabalho
  // (qualquer status, so' o ciclo aberto).
  const diagramadorEarnings = isCriador
    ? computeDiagramadorEarnings(sentAll, usersWithRate)
    : [];
  const diagramadorEarningsMax = Math.max(
    1,
    ...diagramadorEarnings.map((u) => u.earnings),
  );

  // -------------------------------------------------- tendencia de ciclos
  // Todos os ciclos com pelo menos um album enviado, do mais antigo ao mais
  // recente — nao so' os ultimos. Criador ve' receita bruta da organizacao
  // (mesmo numero do /financial); diagramador/admin ve' so' os proprios
  // ganhos, igual ao resto da pagina.
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

  // ------------------------------------------- distribuicao por status
  // Todo o historico (inclusive descartado/duplicado), nao so' o ciclo
  // atual — "Fluxo de producao" acima ja' cobre o instantaneo do ciclo
  // aberto, esta rosca responde "no total, como as coisas terminam".
  const statusCounts = new Map<AlbumStatus, number>();
  for (const a of scopeAlbums) {
    const s = a.status as AlbumStatus;
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  }
  const statusDistribution: StatusSlice[] = Array.from(
    statusCounts.entries(),
  )
    .map(([status, value]) => ({
      key: status,
      label: ALBUM_STATUS_LABELS[status],
      value,
      token: STATUS_TOKEN[status],
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Hero — a primeira linha responde "onde estou no ciclo" e a manchete
          responde "o que falta". Antes o titulo era so' uma saudacao. */}
      <div className="space-y-3">
        <p className="glass-chip inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "hsl(var(--success))" }}
            aria-hidden="true"
          />
          Ciclo {cycle.label} · pagamento em {formatDate(cycle.paymentDate)}
        </p>
        <h1 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.5rem]">
          Olá, {firstName}.{" "}
          {pending.length > 0 ? (
            <>
              Faltam{" "}
              <span style={{ color: "hsl(var(--ink-amber))" }}>
                {pending.length} álbu{pending.length === 1 ? "m" : "ns"}
              </span>{" "}
              para fechar o ciclo.
            </>
          ) : (
            <span className="text-muted-foreground">
              Ciclo em dia — nada pendente de envio.
            </span>
          )}
        </h1>
      </div>

      {/* KPIs — cada um leva pra tela que resolve o numero. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={isCriador ? "Faturamento da equipe" : "Seu faturamento"}
          value={formatBRL(cycleRevenue)}
          icon={Wallet}
          href="/financial"
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
              ? `${cycleSent.length} enviado${cycleSent.length === 1 ? "" : "s"} neste ciclo`
              : `${cycleSent.length} enviado${cycleSent.length === 1 ? "" : "s"} · vs. ciclo anterior`
          }
        />
        <StatCard
          title="Próximo ciclo em"
          value={daysToTurnover}
          unit={daysToTurnover === 1 ? "dia" : "dias"}
          accent="amber"
          icon={CalendarClock}
          description={`Vira ${shortDay(turnover)} · pagamento em ${formatDate(cycle.paymentDate)}`}
        />
        <StatCard
          title="Faltam enviar"
          value={pending.length}
          unit={pending.length === 1 ? "álbum" : "álbuns"}
          icon={Send}
          href="/fila"
          description={
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
        <StatCard
          title="Tipos no ciclo"
          value={byType.length}
          unit={byType.length === 1 ? "ativo" : "ativos"}
          accent="amber"
          icon={Layers}
          href="/albums"
          description={
            byType.length
              ? byType.map((t) => `${t.label} ${t.count}`).join(" · ")
              : "Nenhum álbum neste ciclo"
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-4">
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

          <CycleTrendChart
            points={trendPoints}
            description={
              isCriador
                ? "Receita bruta da organização em todos os ciclos, do mais antigo ao atual."
                : "Seus ganhos em todos os ciclos, do mais antigo ao atual."
            }
          />

          {/* Fluxo de producao — barras horizontais, na ordem do fluxo. */}
          <section className="glass p-5">
            <h2 className="text-base font-semibold tracking-tight">
              Fluxo de produção
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Os {inCycle.length} álbu{inCycle.length === 1 ? "m" : "ns"} cujo
              ciclo de início é o atual.
            </p>
            <div className="mt-4 space-y-2.5">
              {flow.map((f) => (
                <BarRow
                  key={f.status}
                  label={f.label}
                  value={f.count}
                  ratio={f.count / flowMax}
                  token={f.token}
                  right={String(f.count)}
                />
              ))}
            </div>
          </section>

          {isCriador && byUser.length > 0 && (
            <section className="glass p-5">
              <h2 className="text-base font-semibold tracking-tight">
                Por diagramador
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Álbuns do ciclo atual por responsável.
              </p>
              <div className="mt-4 space-y-2.5">
                {byUser.map((u) => (
                  <BarRow
                    key={u.name}
                    label={u.name}
                    value={u.count}
                    ratio={u.count / byUserMax}
                    token="--brand-blue"
                    right={String(u.count)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Receita, nao so' contagem: complementa "Por diagramador" acima
              mostrando quanto cada um ja' ganhou no total — nao so' o ciclo
              atual, todo o historico de envios. */}
          {isCriador && diagramadorEarnings.length > 0 && (
            <section className="glass p-5">
              <h2 className="text-base font-semibold tracking-tight">
                Receita por diagramador
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Comissão acumulada em todo o histórico.
              </p>
              <div className="mt-4 space-y-2.5">
                {diagramadorEarnings.map((u) => (
                  <BarRow
                    key={u.userId}
                    label={u.name}
                    value={u.earnings}
                    ratio={u.earnings / diagramadorEarningsMax}
                    token="--brand-amber"
                    right={`${u.count} · ${formatBRL(u.earnings)}`}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          {/* Tipos de album — conta e valor lado a lado: sem o valor, "14
              colabs" e "9 especiais" parecem equivalentes, e nao sao. */}
          <section className="glass p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight">
                Tipos de álbum
              </h2>
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Ciclo
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {byType.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Nenhum álbum neste ciclo ainda.
                </p>
              )}
              {byType.map((t) => (
                <BarRow
                  key={t.type}
                  label={t.label}
                  value={t.total}
                  ratio={t.total / typeMax}
                  token={t.token}
                  right={`${t.count} · ${formatBRL(t.total)}`}
                />
              ))}
            </div>
          </section>

          <StatusDonutChart
            data={statusDistribution}
            description={`Todo o histórico: ${scopeAlbums.length} álbu${scopeAlbums.length === 1 ? "m" : "ns"}, incluindo o ciclo atual.`}
          />

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
            <h2 className="relative text-base font-semibold tracking-tight">
              Meta pessoal
            </h2>
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
                className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--ink-blue))] hover:underline"
              >
                Definir uma meta
                <ArrowRight className="h-3.5 w-3.5" weight="regular" />
              </Link>
            )}
          </section>

          {/* Proximos pagamentos */}
          <section className="glass p-5">
            <h2 className="text-base font-semibold tracking-tight">
              Próximos pagamentos
            </h2>
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
                        {p.count} álbu{p.count === 1 ? "m" : "ns"}
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

          {(openProblems ?? 0) > 0 && (
            <Link
              href="/albums"
              className="glass relative block overflow-hidden p-5 text-white transition-transform hover:-translate-y-0.5"
              style={{
                background:
                  "linear-gradient(135deg, hsl(25 90% 52%), hsl(38 92% 50%))",
                borderColor: "hsl(25 90% 40% / 0.5)",
              }}
            >
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/80">
                Problemas em aberto
              </p>
              <p className="mt-2 flex items-center gap-2 font-display text-[1.75rem] font-semibold leading-none tabular-nums">
                <AlertTriangle className="h-5 w-5" weight="bold" />
                {openProblems}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-white/85">
                Ver os álbuns afetados
                <ArrowRight className="h-3.5 w-3.5" weight="regular" />
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Linha de barra horizontal. Rotulo em cima, valor a' direita, trilho com o
 * sulco interno (.progress-track) pra barra parecer embutida no vidro.
 */
function BarRow({
  label,
  ratio,
  token,
  right,
}: {
  label: string;
  value: number;
  ratio: number;
  token: string;
  right: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-foreground/80">{label}</span>
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
          {right}
        </span>
      </div>
      <div className="progress-track mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--chip)]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.max(2, ratio * 100)}%`,
            background: `hsl(var(${token}))`,
          }}
        />
      </div>
    </div>
  );
}
