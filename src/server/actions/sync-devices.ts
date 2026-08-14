"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "./auth";

// Formato do Syncthing: 8 grupos de 7 caracteres, separados por hífen.
// NÃO exportar: em arquivo "use server" só função async pode ser exportada,
// e um `export const` aqui quebra o build inteiro.
const DEVICE_ID_REGEX = /^[A-Z0-9]{7}(-[A-Z0-9]{7}){7}$/;

const schema = z.object({
  device_id: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      DEVICE_ID_REGEX,
      "Código inválido. Ele tem 8 blocos de 7 caracteres separados por hífen.",
    ),
  apelido: z.string().trim().max(60).optional().or(z.literal("")),
});

export type SyncDeviceInput = z.infer<typeof schema>;

export async function upsertSyncDeviceAction(
  input: SyncDeviceInput,
): Promise<ActionResult> {
  const session = await requireUser();

  // O Syncthing mostra o ID com hífens, mas ao copiar de alguns lugares vem
  // sem — normalizar antes de validar evita rejeitar um código correto.
  const bruto = input.device_id.trim().toUpperCase().replace(/\s+/g, "");
  const comHifen =
    bruto.includes("-") || bruto.length !== 56
      ? bruto
      : (bruto.match(/.{1,7}/g) ?? []).join("-");

  const parsed = schema.safeParse({ ...input, device_id: comHifen });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("sync_devices").upsert(
    {
      user_id: session.profile.id,
      device_id: parsed.data.device_id,
      apelido: parsed.data.apelido || null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[upsertSyncDevice] error:", error);
    return { ok: false, error: "Não foi possível salvar o código." };
  }

  revalidatePath("/transferencias");
  return { ok: true };
}

export async function deleteSyncDeviceAction(): Promise<ActionResult> {
  const session = await requireUser();
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("sync_devices")
    .delete()
    .eq("user_id", session.profile.id);

  if (error) {
    console.error("[deleteSyncDevice] error:", error);
    return { ok: false, error: "Não foi possível remover o código." };
  }

  revalidatePath("/transferencias");
  return { ok: true };
}
