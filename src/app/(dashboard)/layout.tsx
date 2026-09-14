import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  MONTH_NAMES_PT,
  computePaymentCycleForInstant,
  toDateOnly,
} from "@/lib/financial";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { AlbumStatus } from "@/types/database";

/** Etapas que ainda dependem de alguem — vira o badge da /fila. */
const PENDING: AlbumStatus[] = ["baixado", "editando", "montado"];

/** "03 — 18 set" quando o ciclo fica no mesmo mes; "18 set — 03 out" quando vira. */
function cycleLabel(start: Date, end: Date) {
  const d = (x: Date) => String(x.getDate()).padStart(2, "0");
  const m = (x: Date) => MONTH_NAMES_PT[x.getMonth()];
  return start.getMonth() === end.getMonth()
    ? `${d(start)} — ${d(end)} ${m(end)}`
    : `${d(start)} ${m(start)} — ${d(end)} ${m(end)}`;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  // Resumo do ciclo pro chip da sidebar e pro badge da /fila. Consulta
  // propria (duas colunas, so' o ciclo corrente) em vez de reaproveitar o
  // listAlbumsForAnalytics do dashboard: isto roda em TODA tela do painel,
  // e aquele traz mil linhas com doze colunas.
  const supabase = await createClient();
  const cycle = computePaymentCycleForInstant(new Date());
  const { data } = await supabase
    .from("albums")
    .select("status, responsible_id")
    .eq("cycle_start", toDateOnly(cycle.cycleStart))
    .neq("status", "descartado");

  const rows = (data ?? []) as {
    status: AlbumStatus;
    responsible_id: string;
  }[];

  const cycleSummary = {
    label: cycleLabel(cycle.cycleStart, cycle.cycleEnd),
    albums: rows.length,
    people: new Set(rows.map((r) => r.responsible_id)).size,
    pending: rows.filter((r) => PENDING.includes(r.status)).length,
  };

  return (
    <DashboardShell
      name={profile.name}
      email={profile.email}
      role={profile.role}
      cycle={cycleSummary}
    >
      {children}
    </DashboardShell>
  );
}
