// Re-export the generated Database type (used by Supabase clients)
export type { Database } from "./supabase";

// Derive friendly row types from the generated schema
import type { Database } from "./supabase";

export type UserRole    = Database["public"]["Enums"]["user_role"];
export type AlbumType   = Database["public"]["Enums"]["album_type"];
export type AlbumStatus = Database["public"]["Enums"]["album_status"];
export type ProblemType = Database["public"]["Enums"]["problem_type"];

export type UserRow         = Database["public"]["Tables"]["users"]["Row"];
export type AlbumRow        = Database["public"]["Tables"]["albums"]["Row"];
export type AlbumProblemRow = Database["public"]["Tables"]["album_problems"]["Row"];
export type AuditLogRow     = Database["public"]["Tables"]["audit_logs"]["Row"];

// `user_goals` isn't in the generated Database type (same situation as the
// `kaz_id` column — the generated types file isn't regenerated on every
// migration), so it's declared by hand here.
export type GoalType = "valor" | "albuns";
export interface UserGoalRow {
  id: string;
  user_id: string;
  goal_type: GoalType;
  goal_value: number;
  created_at: string;
  updated_at: string;
}

// Same situation as `user_goals` — `arquivos` isn't in the generated types.
export type ArquivoCategoria = "contrato" | "tutorial" | "modelo" | "outro";
export type ArquivoKind = "arquivo" | "link";
export interface ArquivoRow {
  id: string;
  title: string;
  description: string | null;
  category: ArquivoCategoria;
  kind: ArquivoKind;
  link_url: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
