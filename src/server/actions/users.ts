"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateInput,
  type UserUpdateInput,
} from "@/lib/validations";
import type { ActionResult } from "./auth";

export async function createUserAction(
  input: UserCreateInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = userCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const admin = createAdminClient();
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { name: parsed.data.name },
  });

  if (authErr || !authUser.user) {
    return {
      ok: false,
      error: authErr?.message ?? "Não foi possível criar o usuário.",
    };
  }

  const { error: profileErr } = await admin.from("users").insert({
    id: authUser.user.id,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
    active: true,
  });

  if (profileErr) {
    // Rollback auth user
    await admin.auth.admin.deleteUser(authUser.user.id);
    return {
      ok: false,
      error: "Falha ao criar perfil: " + profileErr.message,
    };
  }

  revalidatePath("/users");
  return { ok: true, data: { id: authUser.user.id } };
}

export async function updateUserAction(
  input: UserUpdateInput,
): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = userUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  // Non-admins can only edit themselves and only the name.
  if (session.profile.role !== "admin") {
    if (parsed.data.id !== session.profile.id) {
      return { ok: false, error: "Sem permissão." };
    }
    delete (parsed.data as Record<string, unknown>).role;
    delete (parsed.data as Record<string, unknown>).active;
  }

  const supabase = await createClient();
  const { id, ...rest } = parsed.data;
  const { error } = await supabase.from("users").update(rest).eq("id", id);
  if (error) {
    return { ok: false, error: "Não foi possível atualizar." };
  }

  revalidatePath("/users");
  return { ok: true };
}

export async function deactivateUserAction(
  userId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ active: false })
    .eq("id", userId);
  if (error) return { ok: false, error: "Não foi possível desativar." };
  revalidatePath("/users");
  return { ok: true };
}

export async function reactivateUserAction(
  userId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ active: true })
    .eq("id", userId);
  if (error) return { ok: false, error: "Não foi possível reativar." };
  revalidatePath("/users");
  return { ok: true };
}
