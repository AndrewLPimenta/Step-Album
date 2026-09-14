import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ALBUM_STATUS_LABELS,
  ALBUM_TYPE_LABELS,
} from "@/lib/constants";
import {
  MONTH_NAMES_PT,
  computePaymentCycleForInstant,
  toDateOnly,
} from "@/lib/financial";
import type { AlbumStatus, AlbumType } from "@/types/database";

interface Row {
  student_name: string;
  class_code: string | null;
  type: AlbumType;
  status: AlbumStatus;
  value: number;
  responsible_id: string;
  created_at: string;
  payment_date: string | null;
}

/**
 * Separador ";" e decimal com virgula: o Excel em pt-BR abre CSV com virgula
 * como separador de COLUNA, entao um arquivo "correto" (RFC 4180, virgula)
 * chega com tudo numa celula so'. O BOM na frente e' o que faz ele ler UTF-8
 * e nao quebrar os acentos.
 */
function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "number" ? v.toFixed(2).replace(".", ",") : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function brDate(v: string | null): string {
  if (!v) return "";
  const [y, m, d] = v.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export async function GET() {
  // So' pra exigir sessao — o CSV em si sai da RLS, nao do perfil.
  await requireUser();
  const supabase = await createClient();

  const cycle = computePaymentCycleForInstant(new Date());

  // Sem filtro por responsavel: a RLS ja' limita o diagramador aos proprios
  // albuns, e o criador precisa do ciclo inteiro. Repetir o filtro aqui so'
  // criaria uma segunda regra de visibilidade pra manter em sincronia.
  const { data, error } = await supabase
    .from("albums")
    .select(
      "student_name, class_code, type, status, value, responsible_id, created_at, payment_date",
    )
    .eq("cycle_start", toDateOnly(cycle.cycleStart))
    .neq("status", "descartado")
    .order("created_at", { ascending: true });

  if (error) {
    return new Response("Não foi possível gerar o arquivo.", { status: 500 });
  }

  const { data: users } = await supabase.from("users").select("id, name");
  const userName = new Map((users ?? []).map((u) => [u.id, u.name]));

  const rows = (data ?? []) as unknown as Row[];
  const header = [
    "Formando",
    "Turma",
    "Tipo",
    "Status",
    "Valor",
    "Responsável",
    "Criado em",
    "Pagamento",
  ];

  const lines = [
    header.join(";"),
    ...rows.map((r) =>
      [
        csvCell(r.student_name),
        csvCell(r.class_code),
        csvCell(ALBUM_TYPE_LABELS[r.type]),
        csvCell(ALBUM_STATUS_LABELS[r.status]),
        csvCell(Number(r.value)),
        csvCell(userName.get(r.responsible_id) ?? ""),
        csvCell(brDate(r.created_at)),
        csvCell(brDate(r.payment_date)),
      ].join(";"),
    ),
  ];

  const d = (x: Date) => String(x.getDate()).padStart(2, "0");
  const slug = `${d(cycle.cycleStart)}-${d(cycle.cycleEnd)}-${MONTH_NAMES_PT[cycle.cycleEnd.getMonth()]}`;

  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stepalbum-ciclo-${slug}.csv"`,
      // O ciclo muda a cada leitura; um CSV cacheado seria um retrato velho.
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

// O arquivo reflete o estado do banco no instante do clique.
export const dynamic = "force-dynamic";
