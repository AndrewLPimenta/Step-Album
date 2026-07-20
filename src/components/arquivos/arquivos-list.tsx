"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteArquivoAction } from "@/server/actions/arquivos";
import { ALL_ARQUIVO_CATEGORIAS, ARQUIVO_CATEGORIA_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/financial";
import type { ArquivoWithMeta } from "@/lib/queries";
import { toast } from "sonner";
import {
  Download,
  ExternalLink,
  File,
  Link2,
  Loader2,
  Trash2,
} from "lucide-react";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArquivosList({ items }: { items: ArquivoWithMeta[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("todos");

  const filtered = useMemo(
    () => (filter === "todos" ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  function handleDelete(id: string) {
    if (!confirm("Excluir este item? Esta ação é permanente.")) return;
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteArquivoAction(id);
      if (!result.ok) {
        toast.error(result.error);
        setDeletingId(null);
        return;
      }
      toast.success("Removido");
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
        <File className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium">Nenhum arquivo ou link ainda</p>
        <p className="text-xs text-muted-foreground mt-1">
          Use o botão &quot;Adicionar&quot; para compartilhar o primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          {ALL_ARQUIVO_CATEGORIAS.map((c) => (
            <TabsTrigger key={c} value={c}>
              {ARQUIVO_CATEGORIA_LABELS[c]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nada nessa categoria ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id} className="border-border/50 bg-card/30">
              <CardContent className="flex items-center gap-3 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {item.kind === "link" ? (
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <File className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {ARQUIVO_CATEGORIA_LABELS[item.category]}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.description}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {item.created_by_name ?? "Alguém"} · {formatDate(item.created_at)}
                    {item.kind === "arquivo" && item.file_size ? ` · ${formatFileSize(item.file_size)}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.download_url && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={item.download_url} target="_blank" rel="noopener noreferrer" download={item.kind === "arquivo" ? item.file_name ?? undefined : undefined}>
                        {item.kind === "link" ? (
                          <ExternalLink className="h-4 w-4" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={isPending && deletingId === item.id}
                    onClick={() => handleDelete(item.id)}
                  >
                    {isPending && deletingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
