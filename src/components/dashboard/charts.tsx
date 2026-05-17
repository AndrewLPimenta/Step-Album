"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL } from "@/lib/financial";

const CHART_COLORS = [
  "hsl(225,73%,57%)",
  "hsl(45,100%,50%)",
  "hsl(280,60%,62%)",
  "hsl(142,60%,45%)",
  "hsl(0,70%,60%)",
  "hsl(190,70%,50%)",
];

const CHART_COLORS_ALPHA = [
  "hsl(225,73%,57%,0.15)",
  "hsl(45,100%,50%,0.15)",
  "hsl(280,60%,62%,0.15)",
  "hsl(142,60%,45%,0.15)",
  "hsl(0,70%,60%,0.15)",
  "hsl(190,70%,50%,0.15)",
];

interface BarDatum {
  name: string;
  value: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomBarTooltip({ active, payload, label, showValue }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  const color = payload[0].fill as string;
  return (
    <div className="rounded-xl border border-border/50 bg-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur-sm text-sm">
      {label && <p className="mb-1 font-medium text-foreground/80">{label}</p>}
      <p className="tabular-nums font-semibold" style={{ color }}>
        {showValue ? formatBRL(val) : `${val} álbum${val !== 1 ? "ns" : ""}`}
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, fill } = payload[0];
  return (
    <div className="rounded-xl border border-border/50 bg-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur-sm text-sm">
      <p className="font-medium text-foreground/80">{name}</p>
      <p className="tabular-nums font-semibold" style={{ color: fill }}>
        {value} álbum{(value as number) !== 1 ? "ns" : ""}
      </p>
    </div>
  );
}

export function ProductionByUserChart({
  data,
  showValue = false,
}: {
  data: BarDatum[];
  showValue?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>
          {showValue ? "Receita por diagramador" : "Álbuns por diagramador"}
        </CardTitle>
        <CardDescription>
          {showValue
            ? "Receita total no período"
            : "Total de álbuns produzidos no período"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={data}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
              barCategoryGap="35%"
            >
              <defs>
                {data.map((_, i) => (
                  <linearGradient
                    key={i}
                    id={`barGrad${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={CHART_COLORS[i % CHART_COLORS.length]}
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor={CHART_COLORS[i % CHART_COLORS.length]}
                      stopOpacity={0.6}
                    />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  showValue ? `R$${(v as number).toFixed(0)}` : String(v)
                }
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--accent)/0.4)", radius: 6 }}
                content={<CustomBarTooltip showValue={showValue} />}
              />
              <Bar
                dataKey="value"
                radius={[8, 8, 3, 3]}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={`url(#barGrad${i})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function StatusBreakdownChart({ data }: { data: BarDatum[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Distribuição por status</CardTitle>
        <CardDescription>Situação atual da operação</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <defs>
                {data.map((_, i) => (
                  <radialGradient key={i} id={`pieGrad${i}`} cx="50%" cy="50%" r="50%">
                    <stop
                      offset="0%"
                      stopColor={CHART_COLORS[i % CHART_COLORS.length]}
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor={CHART_COLORS[i % CHART_COLORS.length]}
                      stopOpacity={0.75}
                    />
                  </radialGradient>
                ))}
              </defs>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                strokeWidth={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={`url(#pieGrad${i})`}
                    stroke={CHART_COLORS_ALPHA[i % CHART_COLORS_ALPHA.length]}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconSize={8}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function TypeBreakdownChart({ data }: { data: BarDatum[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Distribuição por tipo</CardTitle>
        <CardDescription>Mix de álbuns produzidos</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 60, bottom: 0 }}
              barCategoryGap="30%"
            >
              <defs>
                {data.map((_, i) => (
                  <linearGradient
                    key={i}
                    id={`hBarGrad${i}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor={CHART_COLORS[i % CHART_COLORS.length]}
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor={CHART_COLORS[i % CHART_COLORS.length]}
                      stopOpacity={0.55}
                    />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--accent)/0.4)", radius: 6 }}
                content={<CustomBarTooltip />}
              />
              <Bar
                dataKey="value"
                radius={[3, 8, 8, 3]}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={`url(#hBarGrad${i})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground/50">
      Sem dados no período
    </div>
  );
}
