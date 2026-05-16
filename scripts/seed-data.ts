/**
 * Seed demonstration data: albums in different states and a few problems.
 * Runs only if there are 0 albums in the database (safe to invoke multiple times).
 *
 * Usage:
 *   npm run seed:data
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type {
  AlbumStatus,
  AlbumType,
  Database,
  ProblemType,
} from "../src/types/database";

function makeLocalDate(year: number, month0: number, day: number): Date {
  return new Date(year, month0, day, 0, 0, 0, 0);
}

function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeCycle(d: Date) {
  const day = d.getDate();
  const m = d.getMonth();
  const y = d.getFullYear();
  if (day >= 3 && day < 18) {
    return {
      cycleStart: makeLocalDate(y, m, 3),
      cycleEnd: makeLocalDate(y, m, 18),
      paymentDate: makeLocalDate(y, m + 1, 3),
    };
  }
  if (day >= 18) {
    return {
      cycleStart: makeLocalDate(y, m, 18),
      cycleEnd: makeLocalDate(y, m + 1, 3),
      paymentDate: makeLocalDate(y, m + 1, 18),
    };
  }
  return {
    cycleStart: makeLocalDate(y, m - 1, 18),
    cycleEnd: makeLocalDate(y, m, 3),
    paymentDate: makeLocalDate(y, m, 18),
  };
}

interface SeedAlbum {
  student: string;
  faculty: string;
  type: AlbumType;
  status: AlbumStatus;
  daysAgo: number;
  notes?: string;
  problems?: { problem: ProblemType; description?: string; resolved?: boolean }[];
}

const SEEDS: { ownerEmail: string; albums: SeedAlbum[] }[] = [
  {
    ownerEmail: "laura.kaz@gmail.com",
    albums: [
      {
        student: "Beatriz Almeida",
        faculty: "UFRJ · Direito",
        type: "faculdade",
        status: "concluido",
        daysAgo: 12,
      },
      {
        student: "Caio Mendes",
        faculty: "USP · Engenharia Civil",
        type: "especial",
        status: "editando",
        daysAgo: 5,
        notes: "Revisar capa com formando antes de finalizar.",
        problems: [
          {
            problem: "fotos_insuficientes",
            description: "Faltam 3 fotos do evento de formatura.",
          },
        ],
      },
      {
        student: "Daniela Rocha",
        faculty: "Unicamp · Letras",
        type: "colab",
        status: "baixado",
        daysAgo: 1,
      },
      {
        student: "Ricardo Sousa",
        faculty: "USP · Medicina",
        type: "medicina",
        status: "enviado",
        daysAgo: 22,
        problems: [
          {
            problem: "formando_duplicado",
            description: "Cadastro duplicado removido.",
            resolved: true,
          },
        ],
      },
    ],
  },
  {
    ownerEmail: "andrewpimenta.dev@gmail.com",
    albums: [
      {
        student: "Felipe Oliveira",
        faculty: "PUC-Rio · Administração",
        type: "faculdade",
        status: "montado",
        daysAgo: 7,
      },
      {
        student: "Gabriela Lima",
        faculty: "UFMG · Arquitetura",
        type: "especial",
        status: "concluido",
        daysAgo: 28,
      },
      {
        student: "Henrique Costa",
        faculty: "UFRJ · Medicina",
        type: "medicina",
        status: "editando",
        daysAgo: 3,
        problems: [
          {
            problem: "erro_download",
            description: "Servidor retornou 500 ao baixar pack inicial.",
          },
        ],
      },
    ],
  },
  {
    ownerEmail: "maria.edu.franca@gmail.com",
    albums: [
      {
        student: "Isadora Pereira",
        faculty: "UFF · Psicologia",
        type: "faculdade",
        status: "concluido",
        daysAgo: 18,
      },
      {
        student: "João Vitor",
        faculty: "UFPR · Medicina",
        type: "medicina",
        status: "baixado",
        daysAgo: 2,
      },
      {
        student: "Letícia Martins",
        faculty: "UFSC · Engenharia de Produção",
        type: "colab",
        status: "descartado",
        daysAgo: 30,
        notes: "Formando cancelou.",
        problems: [
          {
            problem: "arquivos_corrompidos",
            description: "Arquivos enviados não abrem.",
          },
        ],
      },
    ],
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local",
    );
    process.exit(1);
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { count } = await admin
    .from("albums")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    console.log(
      `ℹ️  Já existem ${count} álbuns no banco — seed de dados ignorado.`,
    );
    return;
  }

  // Map email → user id
  const { data: users } = await admin.from("users").select("id, email");
  const userByEmail = new Map((users ?? []).map((u) => [u.email, u.id]));

  console.log("🌱 Criando álbuns de exemplo...\n");
  for (const bucket of SEEDS) {
    const ownerId = userByEmail.get(bucket.ownerEmail);
    if (!ownerId) {
      console.warn(`⚠️  Usuário ${bucket.ownerEmail} não encontrado, pulando.`);
      continue;
    }

    for (const a of bucket.albums) {
      const created = new Date();
      created.setDate(created.getDate() - a.daysAgo);
      const cycle = computeCycle(created);

      const { data: inserted, error } = await admin
        .from("albums")
        .insert({
          student_name: a.student,
          faculty: a.faculty,
          type: a.type,
          status: a.status,
          responsible_id: ownerId,
          notes: a.notes ?? null,
          value: 0, // trigger will reset
          cycle_start: toDateOnly(cycle.cycleStart),
          cycle_end: toDateOnly(cycle.cycleEnd),
          payment_date: toDateOnly(cycle.paymentDate),
          created_at: created.toISOString(),
        })
        .select("id")
        .single();

      if (error || !inserted) {
        console.error(`❌ Falha ao inserir ${a.student}:`, error?.message);
        continue;
      }

      console.log(`→ ${a.student} (${a.type}, ${a.status})`);

      if (a.problems?.length) {
        for (const p of a.problems) {
          await admin.from("album_problems").insert({
            album_id: inserted.id,
            problem: p.problem,
            description: p.description ?? null,
            resolved: p.resolved ?? false,
            resolved_at: p.resolved ? new Date().toISOString() : null,
          });
        }
      }
    }
  }

  console.log("\n✨ Dados de demonstração inseridos.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
