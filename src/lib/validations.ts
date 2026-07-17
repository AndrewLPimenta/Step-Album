import { z } from "zod";
import {
  ALL_ALBUM_STATUSES,
  ALL_ALBUM_TYPES,
  ALL_GOAL_TYPES,
  ALL_PROBLEM_TYPES,
} from "./constants";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const albumCreateSchema = z.object({
  student_name: z
    .string()
    .min(2, "Nome muito curto")
    .max(120, "Nome muito longo"),
  faculty: z.string().min(2, "Turma/evento obrigatório").max(120),
  class_code: z.string().max(10).optional().nullable(),
  student_code: z.string().max(10).optional().nullable(),
  type: z.enum(ALL_ALBUM_TYPES as [string, ...string[]]),
  responsible_id: z.string().uuid("Responsável inválido"),
  status: z.enum(ALL_ALBUM_STATUSES as [string, ...string[]]).optional(),
  notes: z.string().max(2000).optional().nullable(),
});
export type AlbumCreateInput = z.infer<typeof albumCreateSchema>;

export const albumUpdateSchema = albumCreateSchema.partial().extend({
  id: z.string().uuid(),
});
export type AlbumUpdateInput = z.infer<typeof albumUpdateSchema>;

export const albumStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ALL_ALBUM_STATUSES as [string, ...string[]]),
});
export type AlbumStatusInput = z.infer<typeof albumStatusSchema>;

export const problemCreateSchema = z.object({
  album_id: z.string().uuid(),
  problem: z.enum(ALL_PROBLEM_TYPES as [string, ...string[]]),
  description: z.string().max(1000).optional().nullable(),
});
export type ProblemCreateInput = z.infer<typeof problemCreateSchema>;

export const userCreateSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  role: z.enum(["admin", "diagramador"]),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(80).optional(),
  role: z.enum(["admin", "diagramador"]).optional(),
  active: z.boolean().optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const goalSchema = z.object({
  goal_type: z.enum(ALL_GOAL_TYPES as [string, ...string[]]),
  goal_value: z
    .number()
    .positive("A meta precisa ser maior que zero")
    .max(1_000_000, "Valor muito alto"),
});
export type GoalInput = z.infer<typeof goalSchema>;
