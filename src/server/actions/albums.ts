"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  albumCreateSchema,
  albumStatusSchema,
  albumUpdateSchema,
  problemCreateSchema,
  type AlbumCreateInput,
  type AlbumStatusInput,
  type AlbumUpdateInput,
  type ProblemCreateInput,
} from "@/lib/validations";
import { ALBUM_VALUES } from "@/lib/constants";
import { computePaymentCycle, toDateOnly } from "@/lib/financial";
import type { ActionResult } from "./auth";
import type { AlbumType } from "@/types/database";

async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId: string | null,
  metadata?: Record<string, unknown>,
) {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("audit_logs") as any).insert({
      user_id: userId,
      action,
      entity,
      entity_id: entityId,
      metadata: metadata ?? null,
    });
  } catch (err) {
    console.error("[audit_log] failed:", err);
  }
}

export async function createAlbumAction(
  input: AlbumCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireUser();
  const parsed = albumCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  // Diagramador cannot assign album to other people
  if (
    session.profile.role !== "admin" &&
    parsed.data.responsible_id !== session.profile.id
  ) {
    return { ok: false, error: "Você só pode criar álbuns para si mesmo." };
  }

  const supabase = await createClient();
  const now = new Date();
  const cycle = computePaymentCycle(now);

  const { data, error } = await supabase
    .from("albums")
    .insert({
      student_name: parsed.data.student_name.trim(),
      faculty: parsed.data.faculty.trim(),
      class_code: parsed.data.class_code?.trim() || null,
      student_code: parsed.data.student_code?.trim() || null,
      type: parsed.data.type as AlbumType,
      responsible_id: parsed.data.responsible_id,
      status: (parsed.data.status as "baixado") ?? "baixado",
      notes: parsed.data.notes ?? null,
      value: ALBUM_VALUES[parsed.data.type as AlbumType],
      cycle_start: toDateOnly(cycle.cycleStart),
      cycle_end: toDateOnly(cycle.cycleEnd),
      payment_date: toDateOnly(cycle.paymentDate),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createAlbum] error:", error);
    return { ok: false, error: "Não foi possível criar o álbum." };
  }

  await logAudit(session.profile.id, "album.create", "album", data.id, {
    type: parsed.data.type,
    student: parsed.data.student_name,
  });

  revalidatePath("/albums");
  revalidatePath("/dashboard");
  revalidatePath("/financial");
  revalidatePath("/fila");
  return { ok: true, data: { id: data.id } };
}

export async function updateAlbumAction(
  input: AlbumUpdateInput,
): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = albumUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }
  const { id, ...rest } = parsed.data;

  const supabase = await createClient();

  const update: Record<string, unknown> = { ...rest };
  if (rest.student_name) update.student_name = rest.student_name.trim();
  if (rest.faculty) update.faculty = rest.faculty.trim();
  if (rest.class_code !== undefined) update.class_code = rest.class_code?.trim() || null;
  if (rest.student_code !== undefined) update.student_code = rest.student_code?.trim() || null;
  if (rest.notes !== undefined) update.notes = rest.notes;

  const { error } = await supabase.from("albums").update(update).eq("id", id);
  if (error) {
    console.error("[updateAlbum] error:", error);
    return { ok: false, error: "Não foi possível atualizar o álbum." };
  }

  await logAudit(session.profile.id, "album.update", "album", id, update);
  revalidatePath("/albums");
  revalidatePath(`/albums/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/financial");
  revalidatePath("/fila");
  return { ok: true };
}

export async function updateAlbumStatusAction(
  input: AlbumStatusInput,
): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = albumStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = { status: parsed.data.status };

  // When marked as "enviado" or "concluido", lock the payment cycle
  if (parsed.data.status === "enviado" || parsed.data.status === "concluido") {
    const now = new Date();
    const cycle = computePaymentCycle(now);
    updatePayload.cycle_start = toDateOnly(cycle.cycleStart);
    updatePayload.cycle_end = toDateOnly(cycle.cycleEnd);
    updatePayload.payment_date = toDateOnly(cycle.paymentDate);
    updatePayload.completed_at = now.toISOString();
  }

  const { error } = await supabase
    .from("albums")
    .update(updatePayload)
    .eq("id", parsed.data.id);
  if (error) {
    console.error("[updateAlbumStatus] error:", error);
    return { ok: false, error: "Não foi possível atualizar o status." };
  }
  await logAudit(
    session.profile.id,
    "album.status",
    "album",
    parsed.data.id,
    { status: parsed.data.status },
  );
  revalidatePath("/albums");
  revalidatePath(`/albums/${parsed.data.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/fila");
  return { ok: true };
}

export async function deleteAlbumAction(id: string): Promise<ActionResult> {
  const session = await requireUser();
  if (session.profile.role !== "admin") {
    return { ok: false, error: "Apenas admins podem excluir álbuns." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("albums").delete().eq("id", id);
  if (error) {
    return { ok: false, error: "Não foi possível excluir." };
  }
  await logAudit(session.profile.id, "album.delete", "album", id);
  revalidatePath("/albums");
  revalidatePath("/dashboard");
  revalidatePath("/financial");
  return { ok: true };
}

export async function checkExistingCodesAction(
  codes: Array<{ class_code: string; student_code: string }>,
): Promise<ActionResult<{ keys: string[] }>> {
  if (!codes.length) return { ok: true, data: { keys: [] } };
  await requireUser();
  const supabase = await createClient();

  const uniqueClassCodes = [...new Set(codes.map((c) => c.class_code).filter(Boolean))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("albums")
    .select("class_code, student_code")
    .in("class_code", uniqueClassCodes);

  if (error) return { ok: false, error: "Erro ao verificar duplicatas." };

  const inputKeys = new Set(codes.map((c) => `${c.class_code}|${c.student_code}`));
  const keys: string[] = (data as Array<{ class_code: string; student_code: string }> ?? [])
    .map((r) => `${r.class_code}|${r.student_code}`)
    .filter((k) => inputKeys.has(k));

  return { ok: true, data: { keys } };
}

export async function createAlbumsBulkAction(
  items: Array<{
    student_name: string;
    faculty: string;
    class_code: string;
    student_code: string;
    type: string;
    responsible_id: string;
    kaz_id?: string | null;
  }>,
): Promise<ActionResult<{ count: number; duplicates: number }>> {
  const session = await requireUser();
  if (!items.length) {
    return { ok: false, error: "Nenhum álbum para importar." };
  }
  // Diagramador só pode importar álbuns atribuídos a si mesmo
  if (
    session.profile.role !== "admin" &&
    items.some((item) => item.responsible_id !== session.profile.id)
  ) {
    return { ok: false, error: "Você só pode importar álbuns para si mesmo." };
  }

  const supabase = await createClient();
  const now = new Date();
  const cycle = computePaymentCycle(now);

  const rows = items.map((item) => ({
    student_name: item.student_name.trim(),
    faculty: item.faculty.trim(),
    class_code: item.class_code.trim() || null,
    student_code: item.student_code.trim() || null,
    type: item.type as AlbumType,
    responsible_id: item.responsible_id,
    status: "baixado" as const,
    notes: null,
    kaz_id: item.kaz_id ?? null,
    value: ALBUM_VALUES[item.type as AlbumType],
    cycle_start: toDateOnly(cycle.cycleStart),
    cycle_end: toDateOnly(cycle.cycleEnd),
    payment_date: toDateOnly(cycle.paymentDate),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from("albums")
    .insert(rows)
    .select("id, class_code, student_code");

  if (error) {
    console.error("[createAlbumsBulk] error:", error);
    return { ok: false, error: "Erro ao importar álbuns." };
  }

  // Detect duplicates: within batch + against existing albums in DB
  let duplicatesFound = 0;
  const insertedAlbums = inserted as Array<{ id: string; class_code: string | null; student_code: string | null }>;

  if (insertedAlbums?.length) {
    const insertedIds = insertedAlbums.map((a) => a.id);
    const uniqueClassCodes = [...new Set(insertedAlbums.map((a) => a.class_code).filter(Boolean))];

    // Find pre-existing albums that share a code with any newly imported album
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;
    const { data: existingWithSameCode } = uniqueClassCodes.length
      ? await supabaseAny
          .from("albums")
          .select("id, class_code, student_code")
          .in("class_code", uniqueClassCodes)
          .not("id", "in", `(${insertedIds.join(",")})`)
      : { data: [] };

    // Build a map: code key -> [album ids]
    const codeToIds = new Map<string, string[]>();
    for (const a of insertedAlbums) {
      const key = `${a.class_code}|${a.student_code}`;
      if (!codeToIds.has(key)) codeToIds.set(key, []);
      codeToIds.get(key)!.push(a.id);
    }

    const problemIds = new Set<string>();

    // Within-batch duplicates
    for (const [, ids] of codeToIds) {
      if (ids.length > 1) ids.forEach((id) => problemIds.add(id));
    }

    // Cross-DB duplicates
    for (const existing of (existingWithSameCode as Array<{ id: string; class_code: string | null; student_code: string | null }> ?? [])) {
      const key = `${existing.class_code}|${existing.student_code}`;
      if (codeToIds.has(key)) {
        problemIds.add(existing.id);
        codeToIds.get(key)!.forEach((id) => problemIds.add(id));
      }
    }

    if (problemIds.size > 0) {
      duplicatesFound = problemIds.size;
      const problems = [...problemIds].map((id) => ({
        album_id: id,
        problem: "formando_duplicado" as const,
        description: "Código duplicado detectado automaticamente na importação da Kaz.",
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("album_problems").insert(problems);
    }
  }

  await logAudit(session.profile.id, "album.bulk_create", "album", null, {
    count: rows.length,
    duplicates: duplicatesFound,
  });

  revalidatePath("/albums");
  revalidatePath("/dashboard");
  revalidatePath("/financial");
  revalidatePath("/fila");
  return { ok: true, data: { count: rows.length, duplicates: duplicatesFound } };
}

export async function addProblemAction(
  input: ProblemCreateInput,
): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = problemCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("album_problems").insert({
    album_id: parsed.data.album_id,
    problem: parsed.data.problem as
      | "formando_duplicado"
      | "fotos_insuficientes"
      | "erro_download"
      | "arquivos_corrompidos"
      | "outro",
    description: parsed.data.description ?? null,
  });
  if (error) {
    console.error("[addProblem] error:", error);
    return { ok: false, error: "Não foi possível registrar o problema." };
  }
  await logAudit(
    session.profile.id,
    "problem.create",
    "album",
    parsed.data.album_id,
    { problem: parsed.data.problem },
  );
  revalidatePath(`/albums/${parsed.data.album_id}`);
  revalidatePath("/albums");
  return { ok: true };
}

export async function resolveProblemAction(
  problemId: string,
): Promise<ActionResult> {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("album_problems")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", problemId);
  if (error) {
    return { ok: false, error: "Não foi possível resolver o problema." };
  }
  await logAudit(session.profile.id, "problem.resolve", "album_problem", problemId);
  revalidatePath("/albums");
  return { ok: true };
}

export async function deleteProblemAction(
  problemId: string,
  albumId: string,
): Promise<ActionResult> {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("album_problems")
    .delete()
    .eq("id", problemId);
  if (error) {
    return { ok: false, error: "Não foi possível remover o problema." };
  }
  await logAudit(session.profile.id, "problem.delete", "album_problem", problemId);
  revalidatePath(`/albums/${albumId}`);
  return { ok: true };
}

export async function syncKazIdsAction(
  items: Array<{ class_code: string; student_code: string; kaz_id: string }>,
): Promise<ActionResult<{ updated: number; notFound: number }>> {
  const session = await requireUser();
  const validItems = items.filter((i) => i.class_code && i.student_code && i.kaz_id);
  if (!validItems.length) return { ok: false, error: "Nenhum item com ID Kaz para sincronizar." };

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;
  const results = await Promise.all(
    validItems.map(async (item) => {
      const { data } = await supabaseAny
        .from("albums")
        .update({ kaz_id: item.kaz_id })
        .eq("class_code", item.class_code)
        .eq("student_code", item.student_code)
        .select("id");
      return (data as Array<{ id: string }> | null)?.length ?? 0;
    }),
  );

  const updated = results.reduce((sum, n) => sum + n, 0);

  await logAudit(session.profile.id, "album.sync_kaz_ids", "album", null, {
    count: validItems.length,
    updated,
  });

  revalidatePath("/albums");
  revalidatePath("/fila");
  return { ok: true, data: { updated, notFound: validItems.length - updated } };
}

export async function bulkUpdateStatusAction(
  ids: string[],
  status: import("@/types/database").AlbumStatus,
): Promise<ActionResult> {
  const session = await requireUser();
  if (!ids.length) return { ok: false, error: "Nenhum álbum selecionado." };

  const supabase = await createClient();
  const updatePayload: Record<string, unknown> = { status };

  if (status === "enviado" || status === "concluido") {
    const now = new Date();
    const cycle = computePaymentCycle(now);
    updatePayload.cycle_start = toDateOnly(cycle.cycleStart);
    updatePayload.cycle_end = toDateOnly(cycle.cycleEnd);
    updatePayload.payment_date = toDateOnly(cycle.paymentDate);
    updatePayload.completed_at = now.toISOString();
  }

  const { error } = await supabase.from("albums").update(updatePayload).in("id", ids);
  if (error) {
    console.error("[bulkUpdateStatus] error:", error);
    return { ok: false, error: "Não foi possível atualizar os álbuns." };
  }

  // Quando marcado como inutilizável, cria problema vinculado automaticamente
  const problemTypeMap: Partial<Record<import("@/types/database").AlbumStatus, import("@/types/database").ProblemType>> = {
    fotos_insuficientes: "fotos_insuficientes",
    duplicado: "formando_duplicado",
  };
  const problemType = problemTypeMap[status];
  if (problemType) {
    const problems = ids.map((albumId) => ({
      album_id: albumId,
      type: problemType,
      description: status === "fotos_insuficientes"
        ? "Fotos insuficientes — álbum não será utilizado neste ciclo."
        : "Formando duplicado — esta é a cópia descartada.",
      resolved: false,
      reported_by: session.profile.id,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("album_problems").insert(problems);
  }

  await logAudit(session.profile.id, "album.bulk_status", "album", null, { ids, status });
  revalidatePath("/fila");
  revalidatePath("/albums");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function bulkReassignAction(
  ids: string[],
  responsibleId: string,
): Promise<ActionResult> {
  const session = await requireUser();
  if (!ids.length) return { ok: false, error: "Nenhum álbum selecionado." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("albums")
    .update({ responsible_id: responsibleId })
    .in("id", ids);
  if (error) {
    console.error("[bulkReassign] error:", error);
    return { ok: false, error: "Não foi possível reatribuir os álbuns." };
  }
  await logAudit(session.profile.id, "album.bulk_reassign", "album", null, { ids, responsibleId });
  revalidatePath("/fila");
  revalidatePath("/albums");
  return { ok: true };
}

/**
 * Deleta álbuns inutilizáveis (fotos_insuficientes / duplicado) cujo ciclo já encerrou.
 * Chamado automaticamente no carregamento da fila.
 */
export async function bulkDeleteAction(ids: string[]): Promise<ActionResult> {
  const session = await requireUser();
  if (session.profile.role !== "admin") {
    return { ok: false, error: "Apenas admins podem excluir álbuns." };
  }
  if (!ids.length) return { ok: false, error: "Nenhum álbum selecionado." };
  const supabase = await createClient();
  const { error } = await supabase.from("albums").delete().in("id", ids);
  if (error) {
    console.error("[bulkDelete] error:", error);
    return { ok: false, error: "Não foi possível excluir os álbuns." };
  }
  await logAudit(session.profile.id, "album.bulk_delete", "album", null, { ids, count: ids.length });
  revalidatePath("/albums");
  revalidatePath("/dashboard");
  revalidatePath("/financial");
  revalidatePath("/fila");
  return { ok: true };
}

export async function cleanupExpiredInutilizaveisAction(): Promise<ActionResult<{ deleted: number }>> {
  await requireUser();
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("cleanup_cycle_excluded_albums");
  if (error) {
    console.error("[cleanup] error:", error);
    return { ok: false, error: "Falha na limpeza automática." };
  }
  const deleted = (data as number) ?? 0;
  if (deleted > 0) {
    revalidatePath("/fila");
    revalidatePath("/albums");
    revalidatePath("/dashboard");
  }
  return { ok: true, data: { deleted } };
}
