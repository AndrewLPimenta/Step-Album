"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { goalSchema, type GoalInput } from "@/lib/validations";
import type { ActionResult } from "./auth";

/**
 * Creates or updates the caller's own goal. RLS also enforces user_id =
 * auth.uid(), this check just gives a clean error message instead of a
 * generic RLS failure.
 */
export async function upsertGoalAction(
  input: GoalInput,
): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("user_goals")
    .upsert(
      {
        user_id: session.profile.id,
        goal_type: parsed.data.goal_type,
        goal_value: parsed.data.goal_value,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("[upsertGoal] error:", error);
    return { ok: false, error: "Não foi possível salvar a meta." };
  }

  revalidatePath("/metas");
  return { ok: true };
}

export async function deleteGoalAction(): Promise<ActionResult> {
  const session = await requireUser();
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("user_goals")
    .delete()
    .eq("user_id", session.profile.id);

  if (error) {
    console.error("[deleteGoal] error:", error);
    return { ok: false, error: "Não foi possível remover a meta." };
  }

  revalidatePath("/metas");
  return { ok: true };
}
