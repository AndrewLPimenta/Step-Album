import type { AlbumStatus, AlbumType } from "@/types/database";
import { nowBR, toDateOnly } from "@/lib/financial";

/**
 * Distribuição da sprint — lógica pura, sem Supabase e sem React, para
 * poder ser testada sozinha e para o resultado não depender do fuso do
 * runtime (a Vercel roda em UTC; tudo aqui passa por toBrazilTime).
 */

export interface SprintSettingsRow {
  user_id: string;
  minutos_colab: number;
  minutos_faculdade: number;
  minutos_especial: number;
  minutos_medicina: number;
  horas_por_dia: number;
  status_do_check: AlbumStatus;
  created_at: string;
  updated_at: string;
}

export interface SprintDayOffRow {
  id: string;
  user_id: string;
  dia: string;
  motivo: string | null;
  created_at: string;
}

export const SPRINT_SETTINGS_PADRAO = {
  minutos_colab: 10,
  minutos_faculdade: 15,
  minutos_especial: 20,
  minutos_medicina: 180,
  horas_por_dia: 8,
  status_do_check: "enviado" as AlbumStatus,
};

/** Status que ainda contam como trabalho a fazer. */
export const STATUS_PENDENTES: AlbumStatus[] = ["baixado", "editando", "montado"];

export interface SprintAlbum {
  id: string;
  student_name: string;
  class_code: string | null;
  student_code: string | null;
  faculty: string;
  type: AlbumType;
  status: AlbumStatus;
}

export interface SprintDia {
  /** 'YYYY-MM-DD' */
  data: string;
  /** 0 = domingo */
  diaDaSemana: number;
  folga: boolean;
  hoje: boolean;
  albuns: SprintAlbum[];
  minutos: number;
  capacidadeMinutos: number;
}

export interface SprintPlano {
  dias: SprintDia[];
  /** Não coube na quinzena — o sinal de que a sprint está estourada. */
  sobra: SprintAlbum[];
  totalAlbuns: number;
  totalMinutos: number;
  capacidadeMinutos: number;
  diasUteis: number;
}

export function minutosDoTipo(
  tipo: AlbumType,
  s: Pick<
    SprintSettingsRow,
    "minutos_colab" | "minutos_faculdade" | "minutos_especial" | "minutos_medicina"
  >,
): number {
  switch (tipo) {
    case "colab":
      return s.minutos_colab;
    case "faculdade":
      return s.minutos_faculdade;
    case "especial":
      return s.minutos_especial;
    case "medicina":
      return s.minutos_medicina;
  }
}

/**
 * Lista de dias 'YYYY-MM-DD' de `inicio` até `fim`, inclusive nas duas pontas.
 *
 * ATENÇÃO: as duas datas já têm que estar em horário de Brasília — vindas
 * de `nowBR()` ou de `computePaymentCycle*` (que monta com makeLocalDate).
 * Passar por `toBrazilTime` aqui deslocaria de novo o que já foi
 * deslocado, e a sprint apareceria com um dia a mais ou a menos.
 */
export function diasEntre(inicio: Date, fim: Date): string[] {
  const out: string[] = [];
  const cur = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const ate = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  // guarda contra intervalo invertido ou absurdo (não trava o render)
  let guarda = 0;
  while (cur <= ate && guarda < 400) {
    out.push(toDateOnly(cur));
    cur.setDate(cur.getDate() + 1);
    guarda++;
  }
  return out;
}

/**
 * Reparte os álbuns pendentes pelos dias que sobram até o fim do ciclo.
 *
 * Heurística: do mais caro para o mais barato, cada álbum vai para o dia
 * com MAIS folga no momento (LPT clássico). Isso espalha os medicina —
 * que sozinhos consomem meia jornada — em vez de empilhá-los no começo,
 * e deixa os colab preenchendo os buracos. Empate resolve pelo dia mais
 * cedo, então o resultado é determinístico: mesma entrada, mesmo plano.
 *
 * O que não cabe vai para `sobra` em vez de espremer os dias. Uma sprint
 * que não fecha precisa aparecer como não fechando.
 */
export function montarPlano(params: {
  albuns: SprintAlbum[];
  settings: Pick<
    SprintSettingsRow,
    | "minutos_colab"
    | "minutos_faculdade"
    | "minutos_especial"
    | "minutos_medicina"
    | "horas_por_dia"
  >;
  cicloFim: Date;
  folgas: Set<string>;
  hoje?: Date;
}): SprintPlano {
  const { albuns, settings, cicloFim, folgas } = params;
  // já em horário de Brasília — não converter de novo (ver diasEntre)
  const agora = params.hoje ?? nowBR();
  const hojeStr = toDateOnly(agora);

  const capacidadeDia = Math.round(settings.horas_por_dia * 60);
  const todosOsDias = diasEntre(agora, cicloFim);

  const dias: SprintDia[] = todosOsDias.map((data) => {
    const folga = folgas.has(data);
    const [y, m, d] = data.split("-").map(Number);
    return {
      data,
      diaDaSemana: new Date(y, m - 1, d).getDay(),
      folga,
      hoje: data === hojeStr,
      albuns: [],
      minutos: 0,
      capacidadeMinutos: folga ? 0 : capacidadeDia,
    };
  });

  const uteis = dias.filter((d) => !d.folga);

  const custo = (a: SprintAlbum) => minutosDoTipo(a.type, settings);
  const ordenados = [...albuns].sort((x, y) => {
    const c = custo(y) - custo(x);
    if (c !== 0) return c;
    return x.student_name.localeCompare(y.student_name, "pt-BR");
  });

  const sobra: SprintAlbum[] = [];

  for (const album of ordenados) {
    const c = custo(album);
    let melhor: SprintDia | null = null;
    for (const dia of uteis) {
      const livre = dia.capacidadeMinutos - dia.minutos;
      if (livre < c) continue;
      if (melhor === null || livre > melhor.capacidadeMinutos - melhor.minutos) {
        melhor = dia;
      }
    }
    if (melhor === null) {
      sobra.push(album);
      continue;
    }
    melhor.albuns.push(album);
    melhor.minutos += c;
  }

  // dentro do dia, do mais pesado para o mais leve: o difícil primeiro,
  // enquanto a cabeça está fresca
  for (const dia of dias) {
    dia.albuns.sort((x, y) => {
      const c = custo(y) - custo(x);
      if (c !== 0) return c;
      return x.student_name.localeCompare(y.student_name, "pt-BR");
    });
  }

  const totalMinutos = albuns.reduce((acc, a) => acc + custo(a), 0);

  return {
    dias,
    sobra,
    totalAlbuns: albuns.length,
    totalMinutos,
    capacidadeMinutos: uteis.length * capacidadeDia,
    diasUteis: uteis.length,
  };
}

export function formatarDuracao(minutos: number): string {
  if (minutos <= 0) return "0 min";
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function rotuloDoDia(data: string): string {
  const [y, m, d] = data.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${DIAS_SEMANA[dow]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}
