"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useMemo, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TypeBadge } from "./type-badge";
import { StatusSelect } from "./status-select";
import {
  MoreHorizontal,
  ExternalLink,
  Trash2,
  AlertCircle,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/financial";
import { relativeTime } from "@/lib/utils";
import { deleteAlbumAction, bulkDeleteAction } from "@/server/actions/albums";
import { toast } from "sonner";
import type { AlbumRow } from "@/types/database";

export interface AlbumTableRow extends AlbumRow {
  responsible_name: string | null;
  problems_count: number;
  open_problems_count: number;
}

interface AlbumsTableProps {
  rows: AlbumTableRow[];
  isAdmin: boolean;
}

function albumLabel(album: AlbumTableRow) {
  if (album.class_code && album.student_code) {
    return `${album.class_code}·${album.student_code}`;
  }
  if (album.student_code) return album.student_code;
  if (album.class_code) return album.class_code;
  return null;
}

export function AlbumsTable({ rows, isAdmin }: AlbumsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }

  const toggleOne = useCallback(
    (id: string, index: number, shiftKey: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastClickedIndexRef.current !== null) {
          const from = Math.min(lastClickedIndexRef.current, index);
          const to = Math.max(lastClickedIndexRef.current, index);
          const selecting = !prev.has(id);
          for (let i = from; i <= to; i++) {
            const rangeId = rows[i]?.id;
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
    },
    [rows],
  );

  function handleDelete(id: string) {
    if (!confirm("Excluir este álbum? Esta ação é permanente.")) return;
    startTransition(async () => {
      const r = await deleteAlbumAction(id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Álbum excluído");
    });
  }

  function handleBulkDelete() {
    if (!confirm(`Excluir ${selected.size} álbum${selected.size !== 1 ? "ns" : ""}? Esta ação é permanente e não pode ser desfeita.`)) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      const r = await bulkDeleteAction(ids);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(`${ids.length} álbum${ids.length !== 1 ? "ns" : ""} excluído${ids.length !== 1 ? "s" : ""}`);
        setSelected(new Set());
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium">Nenhum álbum encontrado</p>
        <p className="text-xs text-muted-foreground mt-1">
          Ajuste os filtros ou crie um novo álbum.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: cards ── */}
      <div className="flex flex-col gap-3 md:hidden">
        {/* Select all (mobile) */}
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label="Selecionar todos"
          />
          <span className="text-xs text-muted-foreground">
            {someSelected
              ? `${selected.size} selecionado${selected.size !== 1 ? "s" : ""}`
              : `Selecionar todos (${rows.length})`}
          </span>
        </div>

        {rows.map((album, idx) => {
          const code = albumLabel(album);
          const isChecked = selected.has(album.id);
          return (
            <div
              key={album.id}
              className={`rounded-xl border bg-card/40 p-4 space-y-3 select-none transition-colors ${
                isChecked ? "border-primary/40 bg-accent/30" : "border-border/60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  onClick={(e) => toggleOne(album.id, idx, e.shiftKey)}
                  className="cursor-pointer mt-0.5 shrink-0"
                >
                  <Checkbox checked={isChecked} tabIndex={-1} />
                </div>
                <div className="min-w-0 flex-1">
                  {code && (
                    <p className="text-[11px] font-mono text-muted-foreground mb-0.5">
                      {code}
                    </p>
                  )}
                  <Link
                    href={`/albums/${album.id}`}
                    className="font-semibold text-sm leading-tight hover:underline underline-offset-2 line-clamp-2"
                  >
                    {album.student_name}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {album.faculty}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/albums/${album.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={isPending}
                          onSelect={(e) => {
                            e.preventDefault();
                            handleDelete(album.id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusSelect albumId={album.id} status={album.status} />
                <TypeBadge type={album.type} />
                {album.responsible_name && (
                  <span className="text-xs text-muted-foreground">
                    {album.responsible_name}
                  </span>
                )}
                {album.open_problems_count > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {album.open_problems_count} problema(s)
                  </span>
                )}
              </div>

              {album.payment_date && (
                <p className="text-[11px] text-muted-foreground">
                  Pgto: {formatDate(album.payment_date)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop: tabela ── */}
      <div className="hidden md:block rounded-xl border border-border/60 bg-card/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px]">
                <div onClick={toggleAll} className="cursor-pointer">
                  <Checkbox
                    checked={allSelected}
                    aria-label="Selecionar todos"
                    tabIndex={-1}
                  />
                </div>
              </TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Formando</TableHead>
              <TableHead>Turma / evento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((album, idx) => {
              const code = albumLabel(album);
              const isChecked = selected.has(album.id);
              return (
                <TableRow
                  key={album.id}
                  className={`group select-none ${isChecked ? "bg-accent/40" : ""}`}
                >
                  <TableCell>
                    <div
                      onClick={(e) => toggleOne(album.id, idx, e.shiftKey)}
                      className="cursor-pointer"
                    >
                      <Checkbox
                        checked={isChecked}
                        aria-label={`Selecionar ${album.student_name}`}
                        tabIndex={-1}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {code ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/albums/${album.id}`}
                      className="font-medium hover:underline underline-offset-2"
                    >
                      {album.student_name}
                    </Link>
                    {album.open_problems_count > 0 && (
                      <span
                        title={`${album.open_problems_count} problema(s) em aberto`}
                        className="ml-2 inline-flex items-center gap-1 text-xs text-destructive"
                      >
                        <AlertCircle className="h-3 w-3" />
                        {album.open_problems_count}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[180px] truncate">
                    {album.faculty}
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={album.type} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {album.responsible_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusSelect albumId={album.id} status={album.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(album.payment_date)}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground text-xs"
                    title={formatDate(album.created_at)}
                  >
                    {relativeTime(album.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/albums/${album.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Abrir
                          </Link>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={isPending}
                              onSelect={(e) => {
                                e.preventDefault();
                                handleDelete(album.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-border bg-card shadow-xl px-4 py-3">
          <span className="text-sm font-medium mr-1">
            {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
          </span>
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Excluir
            </Button>
          )}
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
    </>
  );
}

export function AlbumsPagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
      <span>
        Mostrando {start}–{end} de {total}
      </span>
      <div className="flex items-center gap-1">
        <PageLink page={page - 1} disabled={page <= 1} label="Anterior" />
        <span className="px-2">
          Página {page} de {totalPages}
        </span>
        <PageLink
          page={page + 1}
          disabled={page >= totalPages}
          label="Próxima"
        />
      </div>
    </div>
  );
}

function PageLink({
  page,
  disabled,
  label,
}: {
  page: number;
  disabled: boolean;
  label: string;
}) {
  const params = useSearchParams();
  const pathname = usePathname();

  if (disabled) {
    return (
      <Button size="sm" variant="ghost" disabled className="h-7 text-xs">
        {label}
      </Button>
    );
  }

  const p = new URLSearchParams(params.toString());
  p.set("page", String(page));

  return (
    <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
      <Link href={`${pathname}?${p.toString()}`}>{label}</Link>
    </Button>
  );
}
