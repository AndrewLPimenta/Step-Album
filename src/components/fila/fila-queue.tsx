"use client";

import { useState, useTransition, useMemo } from "react";
import { Users, Search, X, ChevronDown, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReassignSelect } from "@/components/fila/reassign-select";
import { bulkUpdateStatusAction, bulkReassignAction } from "@/server/actions/albums";
import { toast } from "sonner";
import type { AlbumStatus, AlbumType } from "@/types/database";

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
  montado: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  enviado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  concluido: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const TYPE_LABEL: Record<AlbumType, string> = {
  colab: "Colab",
  faculdade: "Faculdade",
  especial: "Especial",
  medicina: "Medicina",
};

const BULK_STATUSES: AlbumStatus[] = ["baixado", "descartado", "editando", "montado", "enviado", "concluido"];

export interface FilaAlbum {
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
}

export interface FilaUser {
  id: string;
  name: string;
}

interface Props {
  albums: FilaAlbum[];
  users: FilaUser[];
}

export function FilaQueue({ albums, users }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return albums;
    return albums.filter(
      (a) =>
        a.student_name.toLowerCase().includes(q) ||
        a.faculty.toLowerCase().includes(q) ||
        (a.class_code ?? "").includes(q) ||
        (a.student_code ?? "").includes(q),
    );
  }, [albums, search]);

  const albumsByUser = useMemo(() => {
    const map = new Map<string, FilaAlbum[]>();
    for (const a of filtered) {
      if (!map.has(a.responsible_id)) map.set(a.responsible_id, []);
      map.get(a.responsible_id)!.push(a);
    }
    return map;
  }, [filtered]);

  const activeUsers = users.filter((u) => albumsByUser.has(u.id));
  const allFilteredIds = filtered.map((a) => a.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allFilteredIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkStatus(status: AlbumStatus) {
    const ids = Array.from(selected);
    startTransition(async () => {
      const res = await bulkUpdateStatusAction(ids, status);
      if (res.ok) {
        toast.success(`${ids.length} álbum${ids.length !== 1 ? "ns" : ""} marcado${ids.length !== 1 ? "s" : ""} como ${STATUS_LABEL[status]}`);
        setSelected(new Set());
      } else {
        toast.error(res.error);
      }
    });
  }

  function resolveKazId(a: FilaAlbum): string | null {
    return a.kaz_id ?? null;
  }

  function handleDownload() {
    const selectedAlbums = filtered.filter((a) => selected.has(a.id));

    // Deduplicate by kaz_id (same student may appear more than once)
    const seen = new Set<string>();
    const toDownload: string[] = [];
    let missing = 0;

    for (const a of selectedAlbums) {
      const kazId = resolveKazId(a);
      if (!kazId) { missing++; continue; }
      if (!seen.has(kazId)) { seen.add(kazId); toDownload.push(kazId); }
    }

    if (!toDownload.length) {
      toast.error("Nenhum álbum selecionado tem código válido para download.");
      return;
    }

    // Open synchronously via hidden <a> — avoids popup blocker
    toDownload.forEach((kazId) => {
      const numericId = kazId.replace(/^row_/, "");
      const link = document.createElement("a");
      link.href = `https://api-php.kazformaturas.com.br/apis/download_formando/${numericId}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    const msg = missing > 0
      ? `${toDownload.length} download${toDownload.length !== 1 ? "s" : ""} iniciado${toDownload.length !== 1 ? "s" : ""}. ${missing} sem código ignorado${missing !== 1 ? "s" : ""}.`
      : `${toDownload.length} download${toDownload.length !== 1 ? "s" : ""} iniciado${toDownload.length !== 1 ? "s" : ""}. Certifique-se de estar logado no Kaz.`;
    toast.success(msg);
  }

  function handleBulkReassign(userId: string) {
    const ids = Array.from(selected);
    const userName = users.find((u) => u.id === userId)?.name ?? "—";
    startTransition(async () => {
      const res = await bulkReassignAction(ids, userId);
      if (res.ok) {
        toast.success(`${ids.length} álbum${ids.length !== 1 ? "ns" : ""} reatribuído${ids.length !== 1 ? "s" : ""} para ${userName}`);
        setSelected(new Set());
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nome, turma ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Nenhum álbum encontrado.</p>
      ) : (
        <>
          {/* Select all row */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Selecionar todos"
            />
            <span className="text-xs text-muted-foreground">
              {someSelected ? `${selected.size} selecionado${selected.size !== 1 ? "s" : ""}` : `Selecionar todos (${filtered.length})`}
            </span>
          </div>

          {/* Album list grouped by user */}
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

                  {/* Desktop */}
                  <div className="hidden md:block rounded-lg border border-border/50 overflow-hidden">
                    {userAlbums.map((album, idx) => {
                      const code = [album.class_code, album.student_code].filter(Boolean).join("·") || null;
                      const isChecked = selected.has(album.id);
                      return (
                        <div
                          key={album.id}
                          className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                            idx < userAlbums.length - 1 ? "border-b border-border/30" : ""
                          } ${isChecked ? "bg-accent/50" : "hover:bg-accent/30"}`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleOne(album.id)}
                            aria-label={`Selecionar ${album.student_name}`}
                          />
                          {code ? (
                            <span className="text-xs font-mono text-muted-foreground w-24 shrink-0">{code}</span>
                          ) : (
                            <span className="w-24 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{album.student_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{album.faculty}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_CLASS[album.status]}`}>
                              {STATUS_LABEL[album.status]}
                            </span>
                            <span className="text-xs text-muted-foreground w-16 text-right">
                              {TYPE_LABEL[album.type]}
                            </span>
                            <ReassignSelect
                              albumId={album.id}
                              currentUserId={album.responsible_id}
                              users={users}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden space-y-2">
                    {userAlbums.map((album) => {
                      const code = [album.class_code, album.student_code].filter(Boolean).join("·") || null;
                      const isChecked = selected.has(album.id);
                      return (
                        <div
                          key={album.id}
                          className={`rounded-lg border border-border/50 bg-card/30 px-3 py-2.5 space-y-1.5 ${isChecked ? "border-primary/40 bg-accent/30" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleOne(album.id)}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              {code && <p className="text-xs font-mono text-muted-foreground">{code}</p>}
                              <p className="text-sm font-medium truncate">{album.student_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{album.faculty}</p>
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${STATUS_CLASS[album.status]}`}>
                              {STATUS_LABEL[album.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Reatribuir:</span>
                            <ReassignSelect
                              albumId={album.id}
                              currentUserId={album.responsible_id}
                              users={users}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-border bg-card shadow-xl px-4 py-3">
          <span className="text-sm font-medium mr-1">
            {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending}>
                Mudar status
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {BULK_STATUSES.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => handleBulkStatus(s)}>
                  {STATUS_LABEL[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending}>
                Mudar responsável
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {users.map((u) => (
                <DropdownMenuItem key={u.id} onSelect={() => handleBulkReassign(u.id)}>
                  {u.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isPending}
            title="Baixar no Kaz (você precisa estar logado)"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Baixar Kaz
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
            disabled={isPending}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
