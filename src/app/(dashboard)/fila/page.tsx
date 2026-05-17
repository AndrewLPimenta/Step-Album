import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import type { AlbumStatus, AlbumType, UserRow } from "@/types/database";
import { FilaQueue } from "@/components/fila/fila-queue";

type ActiveStatus = Extract<AlbumStatus, "baixado" | "descartado" | "editando" | "montado" | "enviado">;

interface UserStats {
  baixado: number;
  descartado: number;
  editando: number;
  montado: number;
  enviado: number;
  total: number;
}

const STATUS_PILL: Record<ActiveStatus, string> = {
  baixado: "bg-muted text-muted-foreground",
  descartado: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  editando: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  montado: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  enviado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const STATUS_LABEL_SHORT: Record<ActiveStatus, string> = {
  baixado: "baixado",
  descartado: "descartado",
  editando: "editando",
  montado: "montado",
  enviado: "enviado",
};

export default async function FilaPage() {
  await requireUser();

  const supabase = await createClient();

  const [albumsRes, usersRes] = await Promise.all([
    supabase
      .from("albums")
      .select(
        "id, student_name, class_code, student_code, faculty, type, status, responsible_id, created_at, kaz_id",
      )
      .neq("status", "concluido")
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("id, name, active")
      .eq("active", true)
      .order("name"),
  ]);

  type QueueAlbum = {
    id: string;
    student_name: string;
    class_code: string | null;
    student_code: string | null;
    faculty: string;
    type: AlbumType;
    status: AlbumStatus;
    responsible_id: string;
    created_at: string;
    kaz_id: string | null;
  };

  const albums = (albumsRes.data ?? []) as QueueAlbum[];
  const users = (usersRes.data ?? []) as Pick<UserRow, "id" | "name" | "active">[];

  // Per-user stats for the summary cards
  const userStats = new Map<string, UserStats>();
  for (const u of users) {
    userStats.set(u.id, { baixado: 0, descartado: 0, editando: 0, montado: 0, enviado: 0, total: 0 });
  }
  for (const a of albums) {
    const s = userStats.get(a.responsible_id) ?? { baixado: 0, descartado: 0, editando: 0, montado: 0, enviado: 0, total: 0 };
    s.total += 1;
    const st = a.status as ActiveStatus;
    if (st in s) s[st] += 1;
    userStats.set(a.responsible_id, s);
  }

  const selectUsers = users.map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fila de trabalho</h1>
        <p className="text-sm text-muted-foreground">
          {albums.length} álbum{albums.length !== 1 ? "ns" : ""} em andamento · veja quem está fazendo qual
        </p>
      </div>

      {/* Per-user workload cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => {
          const s = userStats.get(u.id) ?? { baixado: 0, descartado: 0, editando: 0, montado: 0, enviado: 0, total: 0 };
          return (
            <Card key={u.id} className={s.total === 0 ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{u.name}</CardTitle>
                  <span className="text-2xl font-bold tabular-nums">{s.total}</span>
                </div>
              </CardHeader>
              <CardContent>
                {s.total === 0 ? (
                  <span className="text-xs text-muted-foreground">Nenhum álbum</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(["baixado", "descartado", "editando", "montado", "enviado"] as ActiveStatus[]).map((st) =>
                      s[st] > 0 ? (
                        <span key={st} className={`text-xs px-1.5 py-0.5 rounded ${STATUS_PILL[st]}`}>
                          {s[st]} {STATUS_LABEL_SHORT[st]}{s[st] !== 1 && st !== "editando" ? "s" : ""}
                        </span>
                      ) : null,
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Queue with search + multi-select */}
      {albums.length > 0 ? (
        <FilaQueue albums={albums} users={selectUsers} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">Fila vazia</p>
          <p className="text-xs text-muted-foreground mt-1">
            Nenhum álbum em andamento no momento.
          </p>
        </div>
      )}
    </div>
  );
}
