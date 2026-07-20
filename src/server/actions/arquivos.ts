"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  arquivoFileSchema,
  arquivoLinkSchema,
  arquivoUpdateSchema,
  type ArquivoFileInput,
  type ArquivoLinkInput,
  type ArquivoUpdateInput,
} from "@/lib/validations";
import type { ActionResult } from "./auth";

export async function createArquivoLinkAction(
  input: ArquivoLinkInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireUser();
  const parsed = arquivoLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("arquivos")
    .insert({
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      category: parsed.data.category,
      kind: "link",
      link_url: parsed.data.link_url,
      created_by: session.profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createArquivoLink] error:", error);
    return { ok: false, error: "Não foi possível adicionar o link." };
  }

  revalidatePath("/arquivos");
  return { ok: true, data: { id: data.id } };
}

/**
 * Inserts metadata for a file already uploaded client-side to the
 * `arquivos` Storage bucket (direct-to-storage upload bypasses the Next.js
 * server action body size limit).
 */
export async function createArquivoFileAction(
  input: ArquivoFileInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireUser();
  const parsed = arquivoFileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("arquivos")
    .insert({
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      category: parsed.data.category,
      kind: "arquivo",
      storage_path: parsed.data.storage_path,
      file_name: parsed.data.file_name,
      file_size: parsed.data.file_size,
      mime_type: parsed.data.mime_type,
      created_by: session.profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createArquivoFile] error:", error);
    // Best-effort cleanup: metadata insert failed, don't leave an orphaned object.
    await supabase.storage.from("arquivos").remove([parsed.data.storage_path]);
    return { ok: false, error: "Não foi possível salvar o arquivo." };
  }

  revalidatePath("/arquivos");
  return { ok: true, data: { id: data.id } };
}

export async function updateArquivoAction(
  input: ArquivoUpdateInput,
): Promise<ActionResult> {
  await requireUser();
  const parsed = arquivoUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }
  const { id, ...rest } = parsed.data;

  const update: Record<string, unknown> = { ...rest };
  if (rest.title) update.title = rest.title.trim();
  if (rest.description !== undefined) update.description = rest.description?.trim() || null;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("arquivos").update(update).eq("id", id);
  if (error) {
    console.error("[updateArquivo] error:", error);
    return { ok: false, error: "Não foi possível atualizar." };
  }

  revalidatePath("/arquivos");
  return { ok: true };
}

export async function deleteArquivoAction(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("arquivos")
    .select("kind, storage_path")
    .eq("id", id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("arquivos").delete().eq("id", id);
  if (error) {
    console.error("[deleteArquivo] error:", error);
    return { ok: false, error: "Não foi possível excluir." };
  }

  if (existing?.kind === "arquivo" && existing.storage_path) {
    await supabase.storage.from("arquivos").remove([existing.storage_path]);
  }

  revalidatePath("/arquivos");
  return { ok: true };
}
