import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  listSentAlbums,
  buildCycleSummaries,
  computeDiagramadorEarnings,
} from "@/lib/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp, Clock, CheckCircle2, ChevronRight, Users } from "lucide-react";
import { formatBRL, formatDate, computePaymentCycle, toDateOnly } from "@/lib/financial";
import { PaymentAlbumsButton } from "@/components/dashboard/payment-albums-dialog";
import type { UserRow } from "@/types/database";

function daysUntil(dateStr: string, today: Date): number {
  const target = new Date(dateStr + "T00:00:00");
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function FinancialPage() {
  const { profile } = await requireUser();
  const isAdmin = profile.role === "admin";

  const supabase = await createClient();
  const today = new Date();
  const todayStr = toDateOnly(today);

  const usersRes = await supabase.from("users").select("id, name, role, commission_rate").eq("active", true);
  const users = (usersRes.data ?? []) as Pick<UserRow, "id" | "name" | "role" | "commission_rate">[];

  // Admins see all; diagramadores see only their own
  const sentAlbums = await listSentAlbums(isAdmin ? undefined : profile.id);
  const summaries = buildCycleSummaries(sentAlbums, users, today);

  const currentCycle = computePaymentCycle(today);
  const currentPaymentDate = toDateOnly(currentCycle.paymentDate);

  const dayBeforeStart = new Date(currentCycle.cycleStart);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  const prevCycle = computePaymentCycle(dayBeforeStart);
  const prevPaymentDate = toDateOnly(prevCycle.paymentDate);
  const prevIsUpcoming = prevPaymentDate >= todayStr;

  const openSummary = summaries.find((s) => s.paymentDate === currentPaymentDate);
  const closedSummary = prevIsUpcoming
    ? summaries.find((s) => s.paymentDate === prevPaymentDate)
    : null;
  const historySummaries = summaries.filter(
    (s) => s.isPast && s.paymentDate !== currentPaymentDate && s.paymentDate !== prevPaymentDate,
  );

  const daysUntilClose = daysUntil(toDateOnly(currentCycle.lastDay), today);
  const daysUntilOpen = openSummary ? daysUntil(currentPaymentDate, today) : null;
  const daysUntilClosed = closedSummary ? daysUntil(prevPaymentDate, today) : null;

  // Admin: all-time per-diagramador earnings
  const diagramadorEarnings = isAdmin ? computeDiagramadorEarnings(sentAlbums, users) : null;

  const myUser = users.find((u) => u.id === profile.id);
  const isOwner = isAdmin && !myUser?.commission_rate;

  type ByUserEntry = { userId: string; name: string; total: number; earnings: number; count: number; isAdmin: boolean; isOwner: boolean };

  // Dono vê a receita bruta do ciclo; comissionado (diagramador ou admin com commission_rate) vê só o que ganhou.
  function myEarnings(summary: { total: number; byUser: ByUserEntry[] } | null | undefined): number {
    if (!summary) return 0;
    if (isOwner) return summary.total;
    return summary.byUser.find((u) => u.userId === profile.id)?.earnings ?? 0;
  }

  // Merge all owner entries into a single "Step Album" row for display
  function mergeOwners(byUser: ByUserEntry[]): ByUserEntry[] {
    const owners = byUser.filter((u) => u.isOwner);
    const others = byUser.filter((u) => !u.isOwner);
    if (owners.length <= 1) return byUser;
    const merged: ByUserEntry = {
      userId: "owners",
      name: "Step Album",
      total: owners.reduce((s, u) => s + u.total, 0),
      earnings: owners.reduce((s, u) => s + u.earnings, 0),
      count: owners.reduce((s, u) => s + u.count, 0),
      isAdmin: true,
      isOwner: true,
    };
    return [merged, ...others];
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Receita total por ciclo quinzenal"
            : "Seus ganhos por álbum produzido"}
        </p>
      </div>

      {/* Cycle cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Closed cycle */}
        <Card className={`border-2 ${closedSummary ? "border-amber-500/40 bg-amber-500/5" : "border-border/40 bg-card/30 opacity-60"}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">Fechado · valor fixo</CardTitle>
              </div>
              {closedSummary && daysUntilClosed !== null && (
                <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">
                  {daysUntilClosed === 0 ? "Hoje!" : daysUntilClosed === 1 ? "Amanhã" : `em ${daysUntilClosed} dias`}
                </Badge>
              )}
            </div>
            <CardDescription>
              {closedSummary
                ? `Ciclo ${closedSummary.label} · pgto ${formatDate(prevPaymentDate)}`
                : "Nenhum ciclo fechado com pagamento pendente"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {closedSummary ? (
              <>
                <p className="text-3xl font-bold tabular-nums">
                  {formatBRL(myEarnings(closedSummary))}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {closedSummary.count} álbum{closedSummary.count !== 1 ? "ns" : ""} enviado{closedSummary.count !== 1 ? "s" : ""}
                  <PaymentAlbumsButton date={prevPaymentDate} total={closedSummary.total} count={closedSummary.count} albums={closedSummary.albums} />
                </div>
                {isAdmin && closedSummary.byUser.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-border/40">
                    {mergeOwners(closedSummary.byUser).map((u) => (
                      <div key={u.name} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {u.name}
                          {!u.isOwner && u.total > 0 && (
                            <span className="ml-1 opacity-50">({Math.round((u.earnings / u.total) * 100)}%)</span>
                          )}
                        </span>
                        <span className="font-medium tabular-nums">{formatBRL(u.earnings)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-3xl font-bold text-muted-foreground/40">—</p>
            )}
          </CardContent>
        </Card>

        {/* Open cycle */}
        <Card className="border-2 border-[hsl(var(--brand-blue)/0.4)] bg-[hsl(var(--brand-blue)/0.05)]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[hsl(var(--brand-blue))]" />
                <CardTitle className="text-base">Em aberto</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs border-[hsl(var(--brand-blue)/0.4)] text-[hsl(var(--brand-blue))]">
                fecha em {daysUntilClose}d
              </Badge>
            </div>
            <CardDescription>
              Ciclo {currentCycle.label} · pgto {formatDate(currentPaymentDate)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold tabular-nums">
              {formatBRL(myEarnings(openSummary))}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {openSummary?.count ?? 0} álbum{(openSummary?.count ?? 0) !== 1 ? "ns" : ""} enviado{(openSummary?.count ?? 0) !== 1 ? "s" : ""}
              {" · "}cresce conforme envios
              {openSummary && <PaymentAlbumsButton date={currentPaymentDate} total={openSummary.total} count={openSummary.count} albums={openSummary.albums} />}
            </div>
            {isAdmin && openSummary && openSummary.byUser.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-border/40">
                {mergeOwners(openSummary.byUser).map((u) => (
                  <div key={u.name} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {u.name}
                      {!u.isOwner && u.total > 0 && (
                        <span className="ml-1 opacity-50">({Math.round((u.earnings / u.total) * 100)}%)</span>
                      )}
                    </span>
                    <span className="font-medium tabular-nums text-[hsl(var(--brand-blue))]">
                      {formatBRL(u.earnings)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment preview chips */}
      {(closedSummary || openSummary) && (
        <div className="flex flex-wrap gap-3">
          {closedSummary && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-xs">
                <span className="font-semibold">{formatBRL(myEarnings(closedSummary))}</span>
                {" "}receber em{" "}
                <span className="font-semibold">{formatDate(prevPaymentDate)}</span>
              </span>
            </div>
          )}
          {openSummary && daysUntilOpen !== null && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs">
                <span className="font-semibold">{formatBRL(myEarnings(openSummary))}</span>
                {" "}projetado para{" "}
                <span className="font-semibold">{formatDate(currentPaymentDate)}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Admin: per-diagramador earnings breakdown */}
      {isAdmin && diagramadorEarnings && diagramadorEarnings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Ganhos por diagramador</CardTitle>
            </div>
            <CardDescription>Comissão por pessoa sobre o valor bruto produzido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {diagramadorEarnings.map((u) => (
              <div key={u.userId} className="flex items-center justify-between rounded-lg border border-border/50 bg-card/30 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {u.name}
                    <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                      {Math.round(u.rate * 100)}%
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {u.count} álbum{u.count !== 1 ? "ns" : ""} · valor bruto {formatBRL(u.total)}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
                  {formatBRL(u.earnings)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {historySummaries.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Histórico</CardTitle>
            </div>
            <CardDescription>Pagamentos anteriores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {historySummaries.map((c) => (
              <div key={c.paymentDate} className="rounded-lg border border-border/50 bg-card/30 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Ciclo {c.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Pago em {formatDate(c.paymentDate)} · {c.count} álbuns
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatBRL(myEarnings(c))}
                  </p>
                </div>
                {isAdmin && c.byUser.length > 1 && (
                  <div className="mt-2 pt-2 border-t border-border/30 flex flex-wrap gap-x-4 gap-y-1">
                    {mergeOwners(c.byUser).map((u) => (
                      <span key={u.name} className="text-xs text-muted-foreground">
                        {u.name}:{" "}
                        <span className="font-medium text-foreground">{formatBRL(u.earnings)}</span>
                        {!u.isOwner && u.total > 0 && (
                          <span className="opacity-50"> ({Math.round((u.earnings / u.total) * 100)}%)</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {summaries.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">
            {isAdmin ? "Nenhum álbum enviado ainda" : "Nenhum álbum seu foi enviado ainda"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            O valor aparece aqui conforme os álbuns forem marcados como enviados.
          </p>
        </div>
      )}
    </div>
  );
}
