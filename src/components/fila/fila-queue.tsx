"use client";

import { useState, useTransition, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Users,
  Search,
  SearchX,
  X,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Download,
} from "@/lib/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReassignSelect } from "@/components/fila/reassign-select";
import { bulkUpdateStatusAction, bulkReassignAction } from "@/server/actions/albums";
import {
  ALBUM_STATUS_LABELS,
  ALBUM_STATUS_STYLES,
  ALBUM_TYPE_LABELS,
  ALL_ALBUM_TYPES,
  KAZ_DOWNLOAD_URL,
} from "@/lib/constants";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import type { AlbumStatus, AlbumType } from "@/types/database";

const ACTIVE_STATUSES: AlbumStatus[] = ["baixado", "editando", "montado", "enviado", "concluido", "descartado"];
const INUTILIZAVEL_STATUSES: AlbumStatus[] = ["fotos_insuficientes", "duplicado"];
const BULK_STATUSES: AlbumStatus[] = [...ACTIVE_STATUSES, ...INUTILIZAVEL_STATUSES];
/**
 * Proximo passo do fluxo de producao. E' o que permite avancar UM album sem
 * passar pela selecao: antes, tirar um album de "baixado" custava marcar a
 * caixa, abrir o menu de status e escolher — tres cliques pro caso mais
 * comum do dia. Estados fora do fluxo (descartado, duplicado,
 * fotos_insuficientes) ficam de fora de proposito: nao ha "proximo" neles.
 */
const NEXT_STATUS: Partial<Record<AlbumStatus, AlbumStatus>> = {
  baixado: "editando",
  editando: "montado",
  montado: "enviado",
  enviado: "concluido",
};

const TYPE_FILTER_ALL = "todos";
const RESPONSIBLE_FILTER_ALL = "todos";
const STATUS_FILTER_ALL = "todos";

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

type AlbumOverride = Partial<Pick<FilaAlbum, "status" | "responsible_id">>;

export function FilaQueue({ albums, users }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(TYPE_FILTER_ALL);
  const [responsibleFilter, setResponsibleFilter] = useState<string>(RESPONSIBLE_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsedUsers, setCollapsedUsers] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const lastClickedIndexRef = useRef<number | null>(null);

  // Instant feedback on bulk status/reassign, hand-rolled since useOptimistic
  // needs React 19 (this app is on 18). Overrides are applied on top of
  // `albums` and pruned once the revalidated prop actually matches them, or
  // immediately if the action fails.
  const [overrides, setOverrides] = useState<Map<string, AlbumOverride>>(new Map());

  useEffect(() => {
    setOverrides((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Map(prev);
      for (const a of albums) {
        const o = next.get(a.id);
        const matches = o && (o.status === undefined || o.status === a.status)
          && (o.responsible_id === undefined || o.responsible_id === a.responsible_id);
        if (matches) {
          next.delete(a.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [albums]);

  const optimisticAlbums = useMemo(() => {
    if (overrides.size === 0) return albums;
    return albums.map((a) => {
      const o = overrides.get(a.id);
      return o ? { ...a, ...o } : a;
    });
  }, [albums, overrides]);

  function applyOptimistic(ids: string[], override: AlbumOverride) {
    setOverrides((prev) => {
      const next = new Map(prev);
      for (const id of ids) next.set(id, override);
      return next;
    });
  }

  function revertOptimistic(ids: string[]) {
    setOverrides((prev) => {
      const next = new Map(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return optimisticAlbums.filter((a) => {
      if (typeFilter !== TYPE_FILTER_ALL && a.type !== typeFilter) return false;
      if (responsibleFilter !== RESPONSIBLE_FILTER_ALL && a.responsible_id !== responsibleFilter) return false;
      if (statusFilter !== STATUS_FILTER_ALL && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.student_name.toLowerCase().includes(q) ||
        a.faculty.toLowerCase().includes(q) ||
        (a.class_code ?? "").includes(q) ||
        (a.student_code ?? "").includes(q)
      );
    });
  }, [optimisticAlbums, search, typeFilter, responsibleFilter, statusFilter]);

  // Selection shouldn't survive items scrolling out of the current filter —
  // otherwise a bulk action can silently act on albums you're not looking at.
  useEffect(() => {
    const filteredIds = new Set(filtered.map((a) => a.id));
    setSelected((prev) => {
      if ([...prev].every((id) => filteredIds.has(id))) return prev;
      const next = new Set([...prev].filter((id) => filteredIds.has(id)));
      return next;
    });
  }, [filtered]);

  const albumsByUser = useMemo(() => {
    const map = new Map<string, FilaAlbum[]>();
    for (const a of filtered) {
      if (!map.has(a.responsible_id)) map.set(a.responsible_id, []);
      map.get(a.responsible_id)!.push(a);
    }
    return map;
  }, [filtered]);

  const activeUsers = useMemo(
    () => users.filter((u) => albumsByUser.has(u.id)),
    [users, albumsByUser],
  );

  // Display order matches what's rendered: grouped by user, in users sort order.
  // Range selection must use this order so shift+click stays within the visible range.
  const displayOrderedAlbums = useMemo(() => {
    const result: FilaAlbum[] = [];
    for (const u of activeUsers) {
      for (const a of albumsByUser.get(u.id) ?? []) result.push(a);
    }
    return result;
  }, [activeUsers, albumsByUser]);

  const displayIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    displayOrderedAlbums.forEach((a, i) => m.set(a.id, i));
    return m;
  }, [displayOrderedAlbums]);
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

  function toggleUserCollapsed(userId: string) {
    setCollapsedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  const toggleOne = useCallback((id: string, index: number, shiftKey: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastClickedIndexRef.current !== null) {
        const from = Math.min(lastClickedIndexRef.current, index);
        const to = Math.max(lastClickedIndexRef.current, index);
        const selecting = !prev.has(id);
        for (let i = from; i <= to; i++) {
          const rangeId = displayOrderedAlbums[i]?.id;
          if (!rangeId) continue;
          if (selecting) next.add(rangeId);
          else next.delete(rangeId);
        }
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    lastClickedIndexRef.current = index;
  }, [displayOrderedAlbums]);

  function handleBulkStatus(status: AlbumStatus) {
    const ids = Array.from(selected);
    applyOptimistic(ids, { status });
    startTransition(async () => {
      const res = await bulkUpdateStatusAction(ids, status);
      if (res.ok) {
        toast.success(`${ids.length} álbum${ids.length !== 1 ? "ns" : ""} marcado${ids.length !== 1 ? "s" : ""} como ${ALBUM_STATUS_LABELS[status]}`);
        setSelected(new Set());
      } else {
        toast.error(res.error);
        revertOptimistic(ids);
      }
    });
  }

  function handleAdvance(album: FilaAlbum) {
    const next = NEXT_STATUS[album.status];
    if (!next) return;
    applyOptimistic([album.id], { status: next });
    startTransition(async () => {
      const res = await bulkUpdateStatusAction([album.id], next);
      if (res.ok) {
        toast.success(`${album.student_name} → ${ALBUM_STATUS_LABELS[next]}`);
      } else {
        toast.error(res.error);
        revertOptimistic([album.id]);
      }
    });
  }

  function handleDownload() {
    const selectedAlbums = filtered.filter((a) => selected.has(a.id));

    // Deduplicate by kaz_id (same student may appear more than once)
    const seen = new Set<string>();
    const toDownload: string[] = [];
    let missing = 0;

    for (const a of selectedAlbums) {
      const kazId = a.kaz_id;
      if (!kazId) { missing++; continue; }
      if (!seen.has(kazId)) { seen.add(kazId); toDownload.push(kazId); }
    }

    if (!toDownload.length) {
      toast.error("Nenhum álbum selecionado tem código válido para download.");
      return;
    }

    // Hidden iframes — avoids popup blocker entirely.
    // <a target="_blank"> only lets the FIRST tab through; all others are blocked.
    // An iframe with a download URL silently triggers the browser download manager
    // without opening new tabs and without popup-blocker interference.
    toDownload.forEach((kazId) => {
      const numericId = kazId.replace(/^row_/, "");
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = KAZ_DOWNLOAD_URL(numericId);
      document.body.appendChild(iframe);
      // Remove after a generous window so the request can complete
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 60_000);
    });

    const msg = missing > 0
      ? `${toDownload.length} download${toDownload.length !== 1 ? "s" : ""} iniciado${toDownload.length !== 1 ? "s" : ""}. ${missing} sem código ignorado${missing !== 1 ? "s" : ""}.`
      : `${toDownload.length} download${toDownload.length !== 1 ? "s" : ""} iniciado${toDownload.length !== 1 ? "s" : ""}. Certifique-se de estar logado no Kaz.`;
    toast.success(msg);
  }

  function handleBulkReassign(userId: string) {
    const ids = Array.from(selected);
    const userName = users.find((u) => u.id === userId)?.name ?? "—";
    applyOptimistic(ids, { responsible_id: userId });
    startTransition(async () => {
      const res = await bulkReassignAction(ids, userId);
      if (res.ok) {
        toast.success(`${ids.length} álbum${ids.length !== 1 ? "ns" : ""} reatribuído${ids.length !== 1 ? "s" : ""} para ${userName}`);
        setSelected(new Set());
      } else {
        toast.error(res.error);
        revertOptimistic(ids);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
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

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TYPE_FILTER_ALL}>Todos os tipos</SelectItem>
            {ALL_ALBUM_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ALBUM_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={RESPONSIBLE_FILTER_ALL}>Todos os responsáveis</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_FILTER_ALL}>Todos os status</SelectItem>
            {ACTIVE_STATUSES.map((st) => (
              <SelectItem key={st} value={st}>
                {ALBUM_STATUS_LABELS[st]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(typeFilter !== TYPE_FILTER_ALL || responsibleFilter !== RESPONSIBLE_FILTER_ALL || statusFilter !== STATUS_FILTER_ALL) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTypeFilter(TYPE_FILTER_ALL);
              setResponsibleFilter(RESPONSIBLE_FILTER_ALL);
              setStatusFilter(STATUS_FILTER_ALL);
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nenhum álbum encontrado"
          description="Nenhum álbum do ciclo atual bate com os filtros de tipo e responsável."
          className="py-10"
        />
      ) : (
        <>
          {/* Barra de acoes — fixa no topo da lista, nao flutuante ao
              selecionar. As acoes em lote ficam visiveis (desabilitadas) antes
              de qualquer selecao: a barra antiga so' existia DEPOIS de marcar
              algo, entao quem nunca marcou nada nao sabia que elas existiam.
              Sticky porque a lista e' longa — rolando, ela continua ao
              alcance sem precisar voltar ao topo. */}
          <div className="glass-chip sticky top-[4.75rem] z-20 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Selecionar todos"
            />
            <span className="text-xs text-muted-foreground">
              {someSelected
                ? `${selected.size} selecionado${selected.size !== 1 ? "s" : ""}`
                : `Selecionar todos (${filtered.length})`}
            </span>
            {filtered.length !== albums.length && (
              <span className="text-xs text-muted-foreground/70">
                · {filtered.length} de {albums.length}
              </span>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {!someSelected && (
                <span className="hidden text-xs text-muted-foreground/70 sm:inline">
                  Marque álbuns para agir em lote
                </span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!someSelected || isPending}
                  >
                    Mudar status
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {BULK_STATUSES.map((st) => (
                    <DropdownMenuItem key={st} onSelect={() => handleBulkStatus(st)}>
                      {ALBUM_STATUS_LABELS[st]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!someSelected || isPending}
                  >
                    Mudar responsável
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
                disabled={!someSelected || isPending}
                title="Baixar no Kaz (você precisa estar logado)"
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                Baixar Kaz
              </Button>

              {someSelected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                  disabled={isPending}
                  aria-label="Limpar seleção"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Album list grouped by user */}
          <div className="space-y-5">
            {activeUsers.map((u) => {
              const userAlbums = albumsByUser.get(u.id) ?? [];
              const isCollapsed = collapsedUsers.has(u.id);
              return (
                <div key={u.id} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleUserCollapsed(u.id)}
                    className="flex w-full items-center gap-2 text-left rounded-md px-1 py-0.5 hover:bg-accent/40 transition-colors"
                    aria-expanded={!isCollapsed}
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                    />
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <h2 className="text-sm font-semibold">{u.name}</h2>
                    <span className="text-xs text-muted-foreground">
                      ({userAlbums.length} álbum{userAlbums.length !== 1 ? "ns" : ""})
                    </span>
                  </button>

                  {!isCollapsed && (
                  <>
                  {/* Desktop */}
                  <div className="hidden md:block glass-chip rounded-xl overflow-hidden">
                    {userAlbums.map((album, idx) => {
                      const code = [album.class_code, album.student_code].filter(Boolean).join("·") || null;
                      const isChecked = selected.has(album.id);
                      const flatIndex = displayIndexMap.get(album.id) ?? 0;
                      return (
                        <div
                          key={album.id}
                          className={`flex items-center gap-3 px-4 py-2.5 transition-colors select-none ${
                            idx < userAlbums.length - 1 ? "border-b border-border/30" : ""
                          } ${isChecked ? "bg-accent/50" : "hover:bg-accent/30"}`}
                        >
                          <Checkbox
                            checked={isChecked}
                            aria-label={`Selecionar ${album.student_name}`}
                            onClick={(e) => toggleOne(album.id, flatIndex, e.shiftKey)}
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
                            <span className={`text-xs px-1.5 py-0.5 rounded ${ALBUM_STATUS_STYLES[album.status]}`}>
                              {ALBUM_STATUS_LABELS[album.status]}
                            </span>
                            <span className="text-xs text-muted-foreground w-16 text-right">
                              {ALBUM_TYPE_LABELS[album.type]}
                            </span>
                            <span className="text-xs text-muted-foreground w-20 truncate text-right" title={u.name}>
                              {u.name}
                            </span>
                            <ReassignSelect
                              albumId={album.id}
                              currentUserId={album.responsible_id}
                              users={users}
                            />
                            <AdvanceButton
                              album={album}
                              disabled={isPending}
                              onAdvance={handleAdvance}
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
                      const flatIndex = displayIndexMap.get(album.id) ?? 0;
                      return (
                        <div
                          key={album.id}
                          className={`glass-chip rounded-xl px-3 py-2.5 space-y-1.5 select-none ${isChecked ? "border-primary/40 bg-accent/30" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Checkbox
                              checked={isChecked}
                              aria-label={`Selecionar ${album.student_name}`}
                              onClick={(e) => toggleOne(album.id, flatIndex, e.shiftKey)}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              {code && <p className="text-xs font-mono text-muted-foreground">{code}</p>}
                              <p className="text-sm font-medium truncate">{album.student_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{album.faculty}</p>
                              <p className="text-xs text-muted-foreground truncate">Responsável: {u.name}</p>
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${ALBUM_STATUS_STYLES[album.status]}`}>
                              {ALBUM_STATUS_LABELS[album.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Reatribuir:</span>
                            <ReassignSelect
                              albumId={album.id}
                              currentUserId={album.responsible_id}
                              users={users}
                            />
                            <div className="ml-auto">
                              <AdvanceButton
                                album={album}
                                disabled={isPending}
                                onAdvance={handleAdvance}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
}

/**
 * Avanca um album para o proximo passo do fluxo. Rotulo com o nome do
 * destino, nao um "→" mudo: o que importa saber antes de clicar e' pra onde
 * o album vai, nao que ele vai andar.
 */
function AdvanceButton({
  album,
  disabled,
  onAdvance,
}: {
  album: FilaAlbum;
  disabled: boolean;
  onAdvance: (album: FilaAlbum) => void;
}) {
  const next = NEXT_STATUS[album.status];
  if (!next) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
      disabled={disabled}
      onClick={() => onAdvance(album)}
      title={`Marcar ${album.student_name} como ${ALBUM_STATUS_LABELS[next]}`}
    >
      {ALBUM_STATUS_LABELS[next]}
      <ArrowRight className="ml-1 h-3 w-3" weight="bold" />
    </Button>
  );
}
