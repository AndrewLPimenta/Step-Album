import { requireUser } from "@/lib/auth";
import {
  computeDashboardStats,
  currentCycleInfo,
  listAlbumsForAnalytics,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  ProductionByUserChart,
  StatusBreakdownChart,
  TypeBreakdownChart,
} from "@/components/dashboard/charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarRange,
  CheckCircle2,
  FileImage,
  Layers,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import {
  ALBUM_STATUS_LABELS,
  ALBUM_TYPE_LABELS,
} from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/financial";
import type { AlbumStatus, AlbumType } from "@/types/database";

export default async function DashboardPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  // Albums for analytics (RLS-scoped)
  const albums = await listAlbumsForAnalytics();

  // Users list (only needed for admin to label "by user" charts)
  const { data: users } = await supabase
    .from("users")
    .select("id, name");

  const stats = await computeDashboardStats(
    albums as Parameters<typeof computeDashboardStats>[0],
    users ?? [],
  );

  // Problem rate
  const { count: albumsWithProblems } = await supabase
    .from("album_problems")
    .select("album_id", { count: "exact", head: true })
    .eq("resolved", false);
  stats.problemRate =
    stats.totalAll > 0
      ? Math.min(1, (albumsWithProblems ?? 0) / stats.totalAll)
      : 0;

  const cycle = currentCycleInfo();
  const isAdmin = profile.role === "admin";

  // Translate breakdown labels
  const byStatus = stats.byStatus.map((s) => ({
    name: ALBUM_STATUS_LABELS[s.name as AlbumStatus],
    value: s.value,
  }));
  const byType = stats.byType.map((t) => ({
    name: ALBUM_TYPE_LABELS[t.name as AlbumType],
    value: t.value,
  }));

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá,{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(125deg, hsl(var(--brand-blue)) 0%, hsl(var(--brand-amber)) 100%)",
            }}
          >
            {profile.name.split(" ")[0]}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Ciclo atual: <span className="font-medium">{cycle.label}</span> ·
          pagamento em{" "}
          <span className="font-medium">{formatDate(cycle.paymentDate)}</span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Semana atual"
          value={stats.totalThisWeek}
          description="álbuns criados"
          icon={CalendarRange}
        />
        <StatCard
          title="Mês atual"
          value={stats.totalThisMonth}
          description="álbuns criados"
          icon={Layers}
        />
        <StatCard
          title="Em andamento"
          value={stats.inProgress}
          description="trabalhos ativos"
          icon={FileImage}
        />
        <StatCard
          title="Concluídos"
          value={stats.concluded}
          description="total no histórico"
          icon={CheckCircle2}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {isAdmin ? (
          <ProductionByUserChart data={stats.byUser} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Meus números</CardTitle>
              <CardDescription>Sua produção pessoal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Metric label="Total" value={stats.totalAll} />
                <Metric label="Em andamento" value={stats.inProgress} />
                <Metric label="Concluídos" value={stats.concluded} />
              </div>
            </CardContent>
          </Card>
        )}
        <StatusBreakdownChart data={byStatus} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TypeBreakdownChart data={byType} />

        {/* Next payments / problems */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Próximos pagamentos
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? "Receita prevista por data"
                : "Suas previsões de recebimento"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.nextPayments.length === 0 && (
              <p className="text-xs text-muted-foreground py-4">
                Nenhum pagamento previsto.
              </p>
            )}
            {stats.nextPayments.map((p) => (
              <div
                key={p.date}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card/30 px-3 py-2.5"
              >
                <div>
                  <div className="text-sm font-medium">{formatDate(p.date)}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.count} álbu{p.count === 1 ? "m" : "ns"}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  {formatBRL(p.total)}
                </div>
              </div>
            ))}
            {stats.problemRate > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                Taxa de problemas: {(stats.problemRate * 100).toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/30 p-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
  );
}
