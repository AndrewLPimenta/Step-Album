import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Deletes expired "fotos_insuficientes"/"duplicado" albums (cycle already
 * closed) via the `cleanup_cycle_excluded_albums` DB function. Used to run
 * on every /fila page load — moved here so it runs once on a schedule
 * instead of on every request. Configured in vercel.json; requires
 * CRON_SECRET to be set in the Vercel project's environment variables
 * (Vercel sends it automatically as the Authorization header for cron
 * invocations once that env var exists).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("cleanup_cycle_excluded_albums");

  if (error) {
    console.error("[cron/cleanup-inutilizaveis] error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: (data as number) ?? 0 });
}
