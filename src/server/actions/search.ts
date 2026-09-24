"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AlbumStatus, AlbumType } from "@/types/database";

export interface QuickSearchAlbum {
  id: string;
  student_name: string;
  class_code: string | null;
  faculty: string;
  type: AlbumType;
  status: AlbumStatus;
}

const termSchema = z.string().trim().min(2).max(80);

/**
 * Busca do command palette (Ctrl/Cmd+K). Separada do `listAlbums`: aqui nao
 * ha paginacao, filtro nem hidratacao de problemas/responsavel — sao no
 * maximo 7 linhas que precisam voltar enquanto a pessoa ainda digita.
 *
 * Sem service role: o RLS e' quem decide se quem busca ve' os albuns da
 * equipe inteira (criador) ou so' os proprios.
 */
export async function quickSearchAlbumsAction(
  term: string,
): Promise<QuickSearchAlbum[]> {
  const parsed = termSchema.safeParse(term);
  if (!parsed.success) return [];

  await requireUser();

  // Virgula e parentese quebram a sintaxe do .or() do PostgREST (ele separa
  // as condicoes por virgula); % e _ sao curingas do ilike. Todos viram
  // espaco em vez de escapar — um termo de busca nao precisa deles.
  const q = parsed.data.replace(/[%_,().]/g, " ").trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from("albums")
    .select("id, student_name, class_code, faculty, type, status")
    .or(
      `student_name.ilike.${like},class_code.ilike.${like},faculty.ilike.${like},student_code.ilike.${like}`,
    )
    .order("created_at", { ascending: false })
    .limit(7);

  if (error) {
    console.error("[quickSearchAlbumsAction]", error);
    return [];
  }
  return (data ?? []) as QuickSearchAlbum[];
}
