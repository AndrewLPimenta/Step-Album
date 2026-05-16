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
