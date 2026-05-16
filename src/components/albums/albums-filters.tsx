"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import {
  ALBUM_STATUS_LABELS,
  ALBUM_TYPE_LABELS,
  ALL_ALBUM_STATUSES,
  ALL_ALBUM_TYPES,
} from "@/lib/constants";
import type { UserRow } from "@/types/database";

interface FiltersProps {
  diagramadores: Pick<UserRow, "id" | "name">[];
  showResponsibleFilter: boolean;
}

export function AlbumsFilters({
  diagramadores,
  showResponsibleFilter,
}: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string | null) => {
      const p = new URLSearchParams(params.toString());
      if (!value || value === "all") p.delete(key);
      else p.set(key, value);
      p.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${p.toString()}`);
      });
    },
    [params, pathname, router],
  );

  const q = params.get("q") ?? "";
  const turma = params.get("turma") ?? "";
  const status = params.get("status") ?? "all";
  const type = params.get("type") ?? "all";
  const responsible = params.get("responsible") ?? "all";
  const hasProblems = params.get("problems") ?? "all";

  const [searchValue, setSearchValue] = useState(q);
  const [turmaValue, setTurmaValue] = useState(turma);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turmaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSearchValue(q); }, [q]);
  useEffect(() => { setTurmaValue(turma); }, [turma]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchValue === q) return;
    debounceRef.current = setTimeout(() => {
      update("q", searchValue || null);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  useEffect(() => {
    if (turmaDebounceRef.current) clearTimeout(turmaDebounceRef.current);
    if (turmaValue === turma) return;
    turmaDebounceRef.current = setTimeout(() => {
      update("turma", turmaValue || null);
    }, 350);
    return () => { if (turmaDebounceRef.current) clearTimeout(turmaDebounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaValue]);

  const hasAny =
    q ||
    turma ||
    status !== "all" ||
    type !== "all" ||
    responsible !== "all" ||
    hasProblems !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Busca por nome */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchValue}
          placeholder="Nome do formando..."
          className="pl-8 h-9"
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      {/* Filtro de turma */}
      <Input
        value={turmaValue}
        placeholder="Cód. turma (ex: 31080)"
        className="h-9 w-[170px] font-mono text-xs"
        onChange={(e) => setTurmaValue(e.target.value)}
      />

      <Select value={status} onValueChange={(v) => update("status", v)}>
        <SelectTrigger className="w-[140px] h-9 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {ALL_ALBUM_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {ALBUM_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={type} onValueChange={(v) => update("type", v)}>
        <SelectTrigger className="w-[130px] h-9 text-xs">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {ALL_ALBUM_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {ALBUM_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showResponsibleFilter && (
        <Select
          value={responsible}
          onValueChange={(v) => update("responsible", v)}
        >
          <SelectTrigger className="w-[150px] h-9 text-xs">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {diagramadores.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={hasProblems} onValueChange={(v) => update("problems", v)}>
        <SelectTrigger className="w-[150px] h-9 text-xs">
          <SelectValue placeholder="Problemas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="yes">Com problemas</SelectItem>
          <SelectItem value="no">Sem problemas</SelectItem>
        </SelectContent>
      </Select>

      {hasAny && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(pathname)}
          className="h-9 gap-1 text-xs"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
