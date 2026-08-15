"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "./auth";

const settingsSchema = z.object({
  minutos_colab: z.number().int().min(1).max(1440),
  minutos_faculdade: z.number().int().min(1).max(1440),
  minutos_especial: z.number().int().min(1).max(1440),
  minutos_medicina: z.number().int().min(1).max(1440),
  horas_por_dia: z.number().min(0.5).max(24),
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
