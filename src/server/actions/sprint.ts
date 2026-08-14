"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { computePaymentCycleForInstant, toDateOnly } from "@/lib/financial";
import type { ActionResult } from "./auth";

const settingsSchema = z.object({
  minutos_colab: z.number().int().min(1).max(1440),
  minutos_faculdade: z.number().int().min(1).max(1440),
  minutos_especial: z.number().int().min(1).max(1440),
  minutos_medicina: z.number().int().min(1).max(1440),
  horas_por_dia: z.number().min(0.5).max(24),
  status_do_check: z.enum(["editando", "montado", "enviado", "concluido"]),
});

export type SprintSettingsInput = z.infer<typeof settingsSchema>;

export async function upsertSprintSettingsAction(
  input: SprintSettingsInput,
): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("sprint_settings")
    .upsert(
      { user_id: session.profile.id, ...parsed.data },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("[upsertSprintSettings] error:", error);
    return { ok: false, error: "Não foi possível salvar os ajustes." };
  }

  revalidatePath("/sprint");
  return { ok: true };
}

const diaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

/** Liga/desliga um dia de folga. Idempotente: repetir não duplica. */
export async function toggleDayOffAction(dia: string): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = diaSchema.safeParse(dia);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existente } = await (supabase as any)
    .from("sprint_days_off")
    .select("id")
    .eq("user_id", session.profile.id)
    .eq("dia", parsed.data)
    .maybeSingle();

  if (existente) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("sprint_days_off")
      .delete()
      .eq("id", existente.id);
    if (error) {
      console.error("[toggleDayOff] delete error:", error);
      return { ok: false, error: "Não foi possível liberar o dia." };
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("sprint_days_off")
      .insert({ user_id: session.profile.id, dia: parsed.data });
    if (error) {
      console.error("[toggleDayOff] insert error:", error);
      return { ok: false, error: "Não foi possível marcar a folga." };
    }
  }

  revalidatePath("/sprint");
  return { ok: true };
}

/**
 * O check da sprint. Move o álbum para o status que o usuário escolheu em
 * sprint_settings.status_do_check.
 *
 * Quando esse status é `enviado`, o ciclo financeiro precisa ser
 * recalculado no MOMENTO da transição — é a mesma regra do resto do app
 * (ver CLAUDE.md, "Ciclos de pagamento"): cycle_start/cycle_end/
 * payment_date só são reescritos aqui, nunca depois. Não repetir esse
 * cálculo faria o álbum cair no ciclo em que foi criado.
 */
export async function checkSprintAlbumAction(
  albumId: string,
): Promise<ActionResult> {
  const session = await requireUser();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from("sprint_settings")
    .select("status_do_check")
    .eq("user_id", session.profile.id)
    .maybeSingle();

  const alvo: string = settings?.status_do_check ?? "enviado";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { status: alvo };

  if (alvo === "enviado") {
    const ciclo = computePaymentCycleForInstant(new Date());
    patch.cycle_start = toDateOnly(ciclo.cycleStart);
    patch.cycle_end = toDateOnly(ciclo.cycleEnd);
    patch.payment_date = toDateOnly(ciclo.paymentDate);
  }
  if (alvo === "concluido") {
    patch.completed_at = new Date().toISOString();
  }

  // RLS já restringe a escrita ao responsável (ou admin/criador); o filtro
  // por responsible_id aqui garante que a sprint pessoal nunca mexa no
  // álbum de outra pessoa, mesmo para quem é criador e enxerga todos.
  const { error } = await supabase
    .from("albums")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as any)
    .eq("id", albumId)
    .eq("responsible_id", session.profile.id);

  if (error) {
    console.error("[checkSprintAlbum] error:", error);
    return { ok: false, error: "Não foi possível atualizar o álbum." };
  }

  revalidatePath("/sprint");
  revalidatePath("/fila");
  revalidatePath("/dashboard");
  return { ok: true };
}
