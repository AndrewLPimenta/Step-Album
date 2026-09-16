"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/financial";

export interface RevenuePoint {
  /** Rotulo curto do eixo X: "03", "07", "18 SET". */
  label: string;
  /** Faturamento acumulado ate' aquele ponto. */
  value: number;
}

export interface RevenueSeries {
  key: string;
  /** Nome da aba: Ciclo / Anterior / Mês. */
  tab: string;
  /** "03 — 18 set" */
  period: string;
  total: number;
  /** Meta do periodo, ou null quando o usuario nao definiu uma. */
  goal: number | null;
  points: RevenuePoint[];
}

const BLUE = "hsl(225 73% 57%)";
const AMBER = "hsl(45 100% 50%)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3.5 py-2.5 text-sm">
      <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="font-semibold tabular-nums text-foreground">
        {formatBRL(payload[0].value as number)}
      </p>
    </div>
  );
}

/**
 * Faturamento acumulado do periodo. Acumulado — nao por dia — de proposito:
 * a pergunta que o card responde e' "quanto ja' garanti neste ciclo e quanto
 * falta pra meta", e a linha tracejada da meta so' faz sentido contra uma
 * curva que sobe.
 */
export function RevenueAreaChart({
  series,
  description,
  emptyHint,
}: {
  series: RevenueSeries[];
  description: string;
  emptyHint: string;
}) {
  const [activeKey, setActiveKey] = useState(series[0]?.key);
  const active = series.find((s) => s.key === activeKey) ?? series[0];
  if (!active) return null;

  const last = active.points[active.points.length - 1];
  const hasData = active.points.some((p) => p.value > 0);

  // Teto do eixo: sempre acima da meta, senao a linha tracejada sai do
  // grafico justamente quando ela e' a informacao mais util (falta muito).
  const max = Math.max(active.total, active.goal ?? 0, 1);

  return (
    <div className="glass overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Faturamento acumulado
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        <div
          className="glass-chip inline-flex items-center rounded-full p-1"
          role="tablist"
          aria-label="Período do gráfico"
        >
          {series.map((s) => {
            const on = s.key === active.key;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActiveKey(s.key)}
                className={
                  "rounded-full px-3.5 py-1 text-sm font-medium transition-all " +
                  (on
                    ? "bg-[hsl(var(--brand-blue))] text-white shadow-[0_10px_20px_-12px_hsl(225_73%_45%/0.9)]"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {s.tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Periodo / acumulado / meta — os tres numeros que o grafico ilustra,
          legiveis sem precisar interpretar a curva. */}
      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
        <Figure label="Período" value={active.period} />
        <Figure
          label="Acumulado"
          value={formatBRL(active.total)}
          ink="var(--ink-blue)"
        />
        <Figure
          label="Meta"
          value={active.goal ? formatBRL(active.goal) : "—"}
          ink="var(--ink-amber)"
        />
      </dl>

      <div className="mt-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={active.points}
              margin={{ top: 10, right: 14, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLUE} stopOpacity={0.3} />
                  <stop offset="55%" stopColor={AMBER} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--brd)"
                strokeDasharray="0"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis hide domain={[0, max * 1.12]} />
              {active.goal ? (
                <ReferenceLine
                  y={active.goal}
                  stroke={AMBER}
                  strokeDasharray="7 6"
                  strokeWidth={1.5}
                />
              ) : null}
              <Tooltip
                content={<RevenueTooltip />}
                cursor={{ stroke: "var(--brd)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={BLUE}
                strokeWidth={2}
                fill="url(#revFill)"
                animationDuration={700}
                animationEasing="ease-out"
                dot={false}
              />
              {last ? (
                <ReferenceDot
                  x={last.label}
                  y={last.value}
                  r={4}
                  fill="var(--glass)"
                  stroke={AMBER}
                  strokeWidth={2.5}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center px-6 text-center text-xs text-muted-foreground">
            {emptyHint}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4 rounded-full"
            style={{ background: BLUE }}
            aria-hidden="true"
          />
          Acumulado
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: AMBER }}
            aria-hidden="true"
          />
          Meta do período
        </span>
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  ink,
}: {
  label: string;
  value: string;
  ink?: string;
}) {
  return (
    <div>
      <dt className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className="mt-1 font-display text-lg font-semibold tabular-nums tracking-tight"
        style={ink ? { color: `hsl(${ink})` } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tendência de vários ciclos
// ---------------------------------------------------------------------------

export interface CyclePoint {
  key: string;
  /** Rotulo curto do eixo X: "03 out". */
  label: string;
  value: number;
  isCurrent?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CycleTrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3.5 py-2.5 text-sm">
      <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="font-semibold tabular-nums text-foreground">
        {formatBRL(payload[0].value as number)}
      </p>
    </div>
  );
}

/**
 * Um ponto por ciclo de pagamento fechado/aberto — complementa o acumulado
 * (RevenueAreaChart, so' o periodo atual) mostrando se a producao esta'
 * subindo ou descendo ciclo a ciclo.
 */
export function CycleTrendChart({
  points,
  description,
}: {
  points: CyclePoint[];
  description: string;
}) {
  const hasData = points.some((p) => p.value > 0);
  return (
    <div className="glass overflow-hidden p-5">
      <h2 className="text-base font-semibold tracking-tight">
        Tendência de ciclos
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={points}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="32%"
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "hsl(var(--brand-blue) / 0.08)", radius: 6 }}
                content={<CycleTrendTooltip />}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 3, 3]}
                animationDuration={600}
                animationEasing="ease-out"
              >
                {points.map((p) => (
                  <Cell
                    key={p.key}
                    fill={
                      p.isCurrent
                        ? "hsl(var(--brand-blue))"
                        : "hsl(var(--brand-blue) / 0.35)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[220px] items-center justify-center text-center text-xs text-muted-foreground">
            Sem ciclos com álbuns enviados ainda.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Distribuição por status (rosca)
// ---------------------------------------------------------------------------

export interface StatusSlice {
  key: string;
  label: string;
  value: number;
  /** Nome do custom property de cor, ex. "--status-active". */
  token: string;
}

function StatusTooltip({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload,
  total,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const { label, value } = payload[0].payload as StatusSlice;
  return (
    <div className="glass rounded-xl px-3.5 py-2.5 text-sm">
      <p className="font-medium text-foreground/80">{label}</p>
      <p className="tabular-nums font-semibold">
        {value} álbu{value !== 1 ? "ns" : "m"}
        <span className="ml-1 font-normal text-muted-foreground">
          · {total > 0 ? Math.round((value / total) * 100) : 0}%
        </span>
      </p>
    </div>
  );
}

/**
 * Proporcao (nao so' contagem absoluta, como o "Fluxo de producao" ja'
 * mostra) — inclui estados fora do fluxo (fotos_insuficientes/duplicado) se
 * houver algum pendente de limpeza pelo cron.
 */
export function StatusDonutChart({
  data,
  description,
}: {
  data: StatusSlice[];
  description: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="glass p-5">
      <h2 className="text-base font-semibold tracking-tight">
        Distribuição por status
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {total === 0 ? (
        <div className="flex h-[160px] items-center justify-center text-center text-xs text-muted-foreground">
          Nenhum álbum neste ciclo ainda.
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-5">
          <ResponsiveContainer width={132} height={132} className="shrink-0">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={40}
                outerRadius={62}
                paddingAngle={2}
                strokeWidth={0}
                animationDuration={600}
                animationEasing="ease-out"
              >
                {data.map((d) => (
                  <Cell key={d.key} fill={`hsl(var(${d.token}))`} />
                ))}
              </Pie>
              <Tooltip content={<StatusTooltip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="min-w-0 flex-1 space-y-1.5">
            {data.map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate text-foreground/80">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: `hsl(var(${d.token}))` }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{d.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {d.value} · {Math.round((d.value / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
