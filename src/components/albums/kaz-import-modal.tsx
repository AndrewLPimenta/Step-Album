"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Upload, ArrowLeft, Loader2, BookOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  checkExistingCodesAction,
  createAlbumsBulkAction,
} from "@/server/actions/albums";
import { ALBUM_TYPE_LABELS, ALL_ALBUM_TYPES } from "@/lib/constants";
import type { AlbumType } from "@/types/database";
import { toast } from "sonner";

interface Diagramador {
  id: string;
  name: string;
}

interface ParsedRow {
  class_code: string;
  student_code: string;
  student_name: string;
  faculty: string;
  type: AlbumType;
  isDuplicate?: boolean;
  duplicateSource?: "batch" | "db" | "both";
}

function parseKazInput(text: string): Omit<ParsedRow, "isDuplicate" | "duplicateSource">[] {
  const trimmed = text.trim();

  if (trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed) as Array<Record<string, string>>;
      return json
        .filter((r) => r.class_code && r.student_name)
        .map((r) => ({
          class_code: String(r.class_code),
          student_code: String(r.student_code ?? ""),
          student_name: String(r.student_name),
          faculty: String(r.faculty ?? ""),
          type: "faculdade" as AlbumType,
        }));
    } catch {
      return [];
    }
  }

  const rows: Omit<ParsedRow, "isDuplicate" | "duplicateSource">[] = [];
  for (const line of trimmed.split("\n")) {
    const cols = line.split("\t");
    const code = cols[1]?.trim() ?? "";
    if (!/^\d{9}$/.test(code)) continue;
    const name = cols[2]?.trim() ?? "";
    const faculty = cols[3]?.trim() ?? "";
    if (!name) continue;
    rows.push({
      class_code: code.slice(0, 5),
      student_code: code.slice(5),
      student_name: name,
      faculty,
      type: "faculdade",
    });
  }
  return rows;
}

const DUPLICATE_LABEL: Record<NonNullable<ParsedRow["duplicateSource"]>, string> = {
  batch: "Código repetido neste lote",
  db: "Código já existe no sistema",
  both: "Código repetido no lote e no sistema",
};

export function KazImportModal({ diagramadores }: { diagramadores: Diagramador[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"paste" | "preview">("paste");
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [globalType, setGlobalType] = useState<AlbumType>("faculdade");
  const [responsibleId, setResponsibleId] = useState(diagramadores[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [isParsing, startParse] = useTransition();

  function handleParse() {
    const parsed = parseKazInput(rawText);
    if (!parsed.length) {
      toast.error("Nenhum álbum encontrado. Verifique o texto colado.");
      return;
    }

    startParse(async () => {
      // Detect within-batch duplicates
      const batchCount = new Map<string, number>();
      for (const r of parsed) {
        const k = `${r.class_code}|${r.student_code}`;
        batchCount.set(k, (batchCount.get(k) ?? 0) + 1);
      }

      // Check against existing albums in DB
      const dbResult = await checkExistingCodesAction(
        parsed.map((r) => ({ class_code: r.class_code, student_code: r.student_code })),
      );
      const dbKeys = new Set(dbResult.ok && dbResult.data ? dbResult.data.keys : []);

      const marked: ParsedRow[] = parsed.map((r) => {
        const k = `${r.class_code}|${r.student_code}`;
        const inBatch = (batchCount.get(k) ?? 1) > 1;
        const inDb = dbKeys.has(k);
        return {
          ...r,
          type: globalType,
          isDuplicate: inBatch || inDb,
          duplicateSource: inBatch && inDb ? "both" : inBatch ? "batch" : inDb ? "db" : undefined,
        };
      });

      setRows(marked);
      setStep("preview");
    });
  }

  function handleTypeChange(rowIndex: number, type: AlbumType) {
    setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, type } : r)));
  }

  function handleGlobalTypeChange(type: AlbumType) {
    setGlobalType(type);
    setRows((prev) => prev.map((r) => ({ ...r, type })));
  }

  function handleImport() {
    if (!responsibleId) {
      toast.error("Selecione um responsável.");
      return;
    }
    startTransition(async () => {
      const result = await createAlbumsBulkAction(
        rows.map((r) => ({ ...r, responsible_id: responsibleId })),
      );
      if (result.ok) {
        const { count, duplicates } = result.data!;
        const msg =
          duplicates > 0
            ? `${count} álbuns importados — ${duplicates} com problema de código duplicado registrado.`
            : `${count} álbuns importados com sucesso!`;
        toast[duplicates > 0 ? "warning" : "success"](msg);
        setOpen(false);
        setStep("paste");
        setRawText("");
        setRows([]);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setStep("paste");
      setRawText("");
      setRows([]);
    }
  }

  const duplicateCount = rows.filter((r) => r.isDuplicate).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          Importar da Kaz
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "paste" ? "Importar álbuns da Kaz" : `Revisar ${rows.length} álbuns`}
          </DialogTitle>
        </DialogHeader>

        {step === "paste" ? (
          <div className="space-y-4 flex-1">
            <p className="text-sm text-muted-foreground">
              Cole abaixo o texto copiado da Kaz — ou o JSON do bookmarklet.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="kaz-text">Conteúdo copiado</Label>
                <Link
                  href="/albums/kaz-bookmarklet"
                  target="_blank"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BookOpen className="h-3 w-3" />
                  Instalar bookmarklet
                </Link>
              </div>
              <Textarea
                id="kaz-text"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={"Cole aqui o texto copiado da tabela do Kaz\nou o JSON gerado pelo bookmarklet"}
                className="font-mono text-xs min-h-[200px]"
              />
            </div>
            <Button
              onClick={handleParse}
              disabled={!rawText.trim() || isParsing}
              className="w-full"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Processar"
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {duplicateCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>{duplicateCount} álbum{duplicateCount !== 1 ? "s" : ""}</strong> com código
                  duplicado — marcados em laranja. Serão importados normalmente com o problema{" "}
                  <em>Formando duplicado</em> registrado automaticamente.
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5 min-w-[160px]">
                <Label>Tipo (todos)</Label>
                <Select
                  value={globalType}
                  onValueChange={(v) => handleGlobalTypeChange(v as AlbumType)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ALBUM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ALBUM_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-[160px]">
                <Label>Responsável</Label>
                <Select value={responsibleId} onValueChange={setResponsibleId}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {diagramadores.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-auto flex-1 rounded-md border text-sm">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nome</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Turma</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Código</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={
                        row.isDuplicate
                          ? "bg-amber-500/10 hover:bg-amber-500/15"
                          : "hover:bg-muted/50"
                      }
                    >
                      <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium">{row.student_name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{row.faculty}</td>
                      <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                        {row.class_code}·{row.student_code}
                      </td>
                      <td className="px-3 py-1.5">
                        <Select
                          value={row.type}
                          onValueChange={(v) => handleTypeChange(i, v as AlbumType)}
                        >
                          <SelectTrigger className="h-7 text-xs w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_ALBUM_TYPES.map((t) => (
                              <SelectItem key={t} value={t} className="text-xs">
                                {ALBUM_TYPE_LABELS[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        {row.isDuplicate && row.duplicateSource && (
                          <span title={DUPLICATE_LABEL[row.duplicateSource]}>
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep("paste")}
                disabled={isPending}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={isPending || !responsibleId}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${rows.length} álbum${rows.length !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
