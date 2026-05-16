import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReassignSelect } from "@/components/fila/reassign-select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, FolderOpen } from "lucide-react";
import type { AlbumStatus, AlbumType, UserRow } from "@/types/database";

const STATUS_LABEL: Record<AlbumStatus, string> = {
  baixado: "Baixado",
  editando: "Editando",
  montado: "Montado",
  enviado: "Enviado",
  concluido: "Concluído",
  descartado: "Descartado",
};

const STATUS_CLASS: Record<AlbumStatus, string> = {
  baixado: "bg-muted text-muted-foreground",
  descartado: "bg-[hsl(var(--brand-amber)/0.12)] text-[hsl(var(--brand-amber))]",
  editando: "bg-[hsl(var(--brand-blue)/0.12)] text-[hsl(var(--brand-blue))]",
  montado:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  enviado:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  concluido:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const TYPE_LABEL: Record<AlbumType, string> = {
  colab: "Colab",
  faculdade: "Faculdade",
  especial: "Especial",
  medicina: "Medicina",
};

type ActiveStatus = Extract<AlbumStatus, "baixado" | "descartado" | "editando" | "montado" | "enviado">;

interface UserStats {
  baixado: number;
  descartado: number;
  editando: number;
  montado: number;
  enviado: number;
  total: number;
}

export default async function FilaPage() {
  const { profile } = await requireUser();
  const isAdmin = profile.role === "admin";

  const supabase = await createClient();

  const [albumsRes, usersRes] = await Promise.all([
    supabase
      .from("albums")
      .select(
        "id, student_name, class_code, student_code, faculty, type, status, responsible_id, created_at",
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
  };

  const albums = (albumsRes.data ?? []) as QueueAlbum[];
  const users = (usersRes.data ?? []) as Pick<UserRow, "id" | "name" | "active">[];

  // Per-user stats
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

  // Group albums by user, preserving order
  const albumsByUser = new Map<string, QueueAlbum[]>();
  for (const a of albums) {
    if (!albumsByUser.has(a.responsible_id)) albumsByUser.set(a.responsible_id, []);
    albumsByUser.get(a.responsible_id)!.push(a);
  }

  const activeUsers = users.filter((u) => (userStats.get(u.id)?.total ?? 0) > 0);
  const selectUsers = users.map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fila de trabalho</h1>
        <p className="text-sm text-muted-foreground">
          {albums.length} álbum{albums.length !== 1 ? "ns" : ""} em andamento ·
          veja quem está fazendo qual
        </p>
      </div>

      {/* ── Per-user workload cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => {
          const s = userStats.get(u.id) ?? { baixado: 0, descartado: 0, editando: 0, montado: 0, enviado: 0, total: 0 };
          return (
            <Card key={u.id} className={s.total === 0 ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{u.name}</CardTitle>
                  <span className="text-2xl font-bold tabular-nums">
                    {s.total}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {s.total === 0 ? (
                  <span className="text-xs text-muted-foreground">Nenhum álbum</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {s.baixado > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {s.baixado} baixado{s.baixado !== 1 ? "s" : ""}
                      </span>
                    )}
                    {s.descartado > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {s.descartado} descartado{s.descartado !== 1 ? "s" : ""}
                      </span>
                    )}
                    {s.editando > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {s.editando} editando
                      </span>
                    )}
                    {s.montado > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        {s.montado} montado{s.montado !== 1 ? "s" : ""}
                      </span>
                    )}
                    {s.enviado > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {s.enviado} enviado{s.enviado !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Albums grouped by user ── */}
      {activeUsers.length > 0 ? (
        <div className="space-y-5">
          {activeUsers.map((u) => {
            const userAlbums = albumsByUser.get(u.id) ?? [];
            return (
              <div key={u.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{u.name}</h2>
                  <span className="text-xs text-muted-foreground">
                    ({userAlbums.length} álbum{userAlbums.length !== 1 ? "ns" : ""})
                  </span>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block rounded-lg border border-border/50 overflow-hidden">
                  {userAlbums.map((album, idx) => {
                    const code =
                      [album.class_code, album.student_code]
                        .filter(Boolean)
                        .join("·") || null;
                    return (
                      <div
                        key={album.id}
                        className={`flex items-center gap-3 px-4 py-2.5 ${
                          idx < userAlbums.length - 1
                            ? "border-b border-border/30"
                            : ""
                        } hover:bg-accent/30 transition-colors`}
                      >
                        {code ? (
                          <span className="text-xs font-mono text-muted-foreground w-24 shrink-0">
                            {code}
                          </span>
                        ) : (
                          <span className="w-24 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {album.student_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {album.faculty}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${STATUS_CLASS[album.status]}`}
                          >
                            {STATUS_LABEL[album.status]}
                          </span>
                          <span className="text-xs text-muted-foreground w-16 text-right">
                            {TYPE_LABEL[album.type]}
                          </span>
                          {isAdmin && (
                            <ReassignSelect
                              albumId={album.id}
                              currentUserId={album.responsible_id}
                              users={selectUsers}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {userAlbums.map((album) => {
                    const code =
                      [album.class_code, album.student_code]
                        .filter(Boolean)
                        .join("·") || null;
                    return (
                      <div
                        key={album.id}
                        className="rounded-lg border border-border/50 bg-card/30 px-3 py-2.5 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {code && (
                              <p className="text-xs font-mono text-muted-foreground">
                                {code}
                              </p>
                            )}
                            <p className="text-sm font-medium truncate">
                              {album.student_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {album.faculty}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${STATUS_CLASS[album.status]}`}
                          >
                            {STATUS_LABEL[album.status]}
                          </span>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Reatribuir:
                            </span>
                            <ReassignSelect
                              albumId={album.id}
                              currentUserId={album.responsible_id}
                              users={selectUsers}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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
