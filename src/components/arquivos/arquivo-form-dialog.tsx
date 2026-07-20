"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createArquivoFileAction,
  createArquivoLinkAction,
} from "@/server/actions/arquivos";
import {
  ALL_ARQUIVO_CATEGORIAS,
  ARQUIVO_CATEGORIA_LABELS,
  ARQUIVO_MAX_FILE_SIZE_BYTES,
  type ArquivoCategoria,
} from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

function sanitizeFileName(name: string) {
  return name.normalize("NFKD").replace(/[^\w.-]+/g, "_");
}

export function ArquivoFormDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"link" | "arquivo">("link");
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ArquivoCategoria>("outro");
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = isPending || uploading;

  function reset() {
    setTitle("");
    setDescription("");
    setCategory("outro");
    setLinkUrl("");
    setMode("link");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "link") {
      startTransition(async () => {
        const result = await createArquivoLinkAction({
          title,
          description: description || null,
          category,
          link_url: linkUrl,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Link adicionado");
        reset();
        setOpen(false);
        router.refresh();
      });
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Escolha um arquivo.");
      return;
    }
    if (file.size > ARQUIVO_MAX_FILE_SIZE_BYTES) {
      toast.error("Arquivo muito grande (máx. 20MB).");
      return;
    }

    startTransition(async () => {
      setUploading(true);
      try {
        const supabase = createClient();
        const path = `${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("arquivos")
          .upload(path, file);
        if (uploadError) {
          toast.error(`Falha no upload: ${uploadError.message}`);
          return;
        }

        const result = await createArquivoFileAction({
          title,
          description: description || null,
          category,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Arquivo enviado");
        reset();
        setOpen(false);
        router.refresh();
      } finally {
        setUploading(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar arquivo ou link</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "link" | "arquivo")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" disabled={busy}>
              Link
            </TabsTrigger>
            <TabsTrigger value="arquivo" disabled={busy}>
              Arquivo
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={busy}
              maxLength={150}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ArquivoCategoria)}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ARQUIVO_CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {ARQUIVO_CATEGORIA_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "link" ? (
            <div className="space-y-1.5">
              <Label htmlFor="link_url">URL</Label>
              <Input
                id="link_url"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                required
                disabled={busy}
                placeholder="https://..."
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="file">Arquivo (máx. 20MB)</Label>
              <Input id="file" type="file" ref={fileInputRef} required disabled={busy} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              rows={2}
              maxLength={1000}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploading ? "Enviando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
