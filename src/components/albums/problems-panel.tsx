"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  addProblemAction,
  resolveProblemAction,
  deleteProblemAction,
} from "@/server/actions/albums";
import { ALL_PROBLEM_TYPES, PROBLEM_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/utils";
import type { AlbumProblemRow, ProblemType } from "@/types/database";
import { Check, X, AlertCircle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface ProblemsPanelProps {
  albumId: string;
  problems: AlbumProblemRow[];
}

export function ProblemsPanel({ albumId, problems }: ProblemsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [problem, setProblem] = useState<ProblemType>("formando_duplicado");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  function handleAdd() {
    startTransition(async () => {
      const r = await addProblemAction({
        album_id: albumId,
        problem,
        description: description || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Problema registrado");
      setDescription("");
      setShowForm(false);
    });
  }

  function handleResolve(id: string) {
    startTransition(async () => {
      const r = await resolveProblemAction(id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Problema marcado como resolvido");
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remover este problema?")) return;
    startTransition(async () => {
      const r = await deleteProblemAction(id, albumId);
      if (!r.ok) toast.error(r.error);
      else toast.success("Problema removido");
    });
  }

  const open = problems.filter((p) => !p.resolved);
  const resolved = problems.filter((p) => p.resolved);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Problemas
          </CardTitle>
          <CardDescription>
            {open.length} em aberto · {resolved.length} resolvido(s)
          </CardDescription>
        </div>
        {!showForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Registrar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 rounded-lg border border-border/60 p-3 bg-muted/30 animate-slide-up">
            <Select
              value={problem}
              onValueChange={(v) => setProblem(v as ProblemType)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PROBLEM_TYPES.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {PROBLEM_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Descrição (opcional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              disabled={isPending}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setDescription("");
                }}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </div>
        )}

        {problems.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Nenhum problema registrado.
          </p>
        ) : (
          <div className="space-y-2">
            {[...open, ...resolved].map((p) => (
              <div
                key={p.id}
                className={`rounded-lg border p-3 text-sm transition-colors ${
                  p.resolved
                    ? "border-border/40 bg-muted/20 opacity-70"
                    : "border-destructive/20 bg-destructive/5"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {PROBLEM_LABELS[p.problem]}
                      </span>
                      {p.resolved && (
                        <Badge variant="success" className="text-[10px]">
                          Resolvido
                        </Badge>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.description}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {relativeTime(p.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!p.resolved && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleResolve(p.id)}
                        disabled={isPending}
                        title="Marcar como resolvido"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(p.id)}
                      disabled={isPending}
                      title="Remover"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
