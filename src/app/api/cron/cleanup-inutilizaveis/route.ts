import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { computePaymentCycle, computePaymentCycleForInstant, toDateOnly } from "@/lib/financial";

/**
 * Daily maintenance, runs on a schedule (vercel.json) instead of on every
 * /fila page load. Requires CRON_SECRET in the Vercel project's env vars
 * (Vercel sends it automatically as the Authorization header for cron
 * invocations once that env var exists).
 *
 * Two jobs:
 * 1. Delete expired "fotos_insuficientes"/"duplicado" albums whose cycle has
 *    already closed, via the `cleanup_cycle_excluded_albums` DB function.
 * 2. Roll forward unfinished work (baixado/editando/montado) still sitting
 *    in the cycle that just closed into the newly-opened current cycle.
 *    /fila and the dashboard only ever show the strictly-current cycle (no
 *    query-time lookback into older backlog) — this is what keeps
 *    not-yet-sent albums from disappearing the moment a cycle boundary
 *    passes, one hop forward at a time, without resurrecting anything from
 *    further back. Confirmed with Andrew on 2026-08-03.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cleanupData, error: cleanupError } = await (supabase as any).rpc(
    "cleanup_cycle_excluded_albums",
  );
  if (cleanupError) {
    console.error("[cron/cleanup-inutilizaveis] cleanup error:", cleanupError);
    return NextResponse.json({ ok: false, error: cleanupError.message }, { status: 500 });
  }

  const now = new Date();
  const currentCycle = computePaymentCycleForInstant(now);
  const currentCycleStart = toDateOnly(currentCycle.cycleStart);

  const dayBeforeCurrentStart = new Date(currentCycle.cycleStart);
  dayBeforeCurrentStart.setDate(dayBeforeCurrentStart.getDate() - 1);
  const previousCycle = computePaymentCycle(dayBeforeCurrentStart);
  const previousCycleStart = toDateOnly(previousCycle.cycleStart);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rolled, error: rollError } = await (supabase as any)
    .from("albums")
    .update({
      cycle_start: currentCycleStart,
      cycle_end: toDateOnly(currentCycle.cycleEnd),
      payment_date: toDateOnly(currentCycle.paymentDate),
    })
    .eq("cycle_start", previousCycleStart)
    .in("status", ["baixado", "editando", "montado"])
    .select("id");

  if (rollError) {
    console.error("[cron/cleanup-inutilizaveis] rollover error:", rollError);
    return NextResponse.json({ ok: false, error: rollError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deleted: (cleanupData as number) ?? 0,
    rolledForward: rolled?.length ?? 0,
  });
}
