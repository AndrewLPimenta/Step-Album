"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Copy, Loader2, Trash2 } from "lucide-react";
import {
  deleteSyncDeviceAction,
  upsertSyncDeviceAction,
} from "@/server/actions/sync-devices";
import type { DispositivoDaEquipe } from "@/app/(dashboard)/transferencias/page";

export function TransferenciasPanel({
  meu,
  dispositivos,
  semCodigo,
}: {
  meu: DispositivoDaEquipe | null;
  dispositivos: DispositivoDaEquipe[];
  semCodigo: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valor, setValor] = useState(meu?.device_id ?? "");
  const [copiado, setCopiado] = useState<string | null>(null);

  function salvar() {
    startTransition(async () => {
      const r = await upsertSyncDeviceAction({ device_id: valor, apelido: "" });
      if (!r.ok) {
        toast.error(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Código salvo. A equipe já consegue te adicionar.");
      router.refresh();
    });
  }

  function remover() {
    startTransition(async () => {
      const r = await deleteSyncDeviceAction();
      if (!r.ok) {
        toast.error(r.error ?? "Não foi possível remover.");
        return;
      }
      setValor("");
      router.refresh();
    });
  }

  async function copiar(texto: string, chave: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado((c) => (c === chave ? null : c)), 1800);
    } catch {
      toast.error("Não consegui copiar. Selecione e copie na mão.");
    }
  }

  const outros = dispositivos.filter((d) => !d.eu);

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------- o meu código */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="device" className="text-sm font-medium">
              Meu código
            </Label>
            <p className="text-xs text-muted-foreground">
              No painel do Syncthing: <strong>Actions → Show ID</strong>. O
              instalador também mostra e já copia.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="device"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX"
              className="font-mono text-xs"
              spellCheck={false}
            />
            <div className="flex gap-2">
              <Button onClick={salvar} disabled={isPending || !valor.trim()}>
                {isPending && <Loader2 className="animate-spin" />}
                Salvar
              </Button>
              {meu && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={remover}
                  disabled={isPending}
                  title="Remover meu código"
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ códigos da equipe */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">
          Códigos da equipe
          {outros.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground">
              ({outros.length})
            </span>
          )}
        </h2>

        {outros.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Ninguém mais cadastrou o código ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {outros.map((d) => (
              <Card key={d.user_id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium">{d.nome}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {d.device_id}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copiar(d.device_id, d.user_id)}
                  >
                    {copiado === d.user_id ? <Check /> : <Copy />}
                    {copiado === d.user_id ? "Copiado" : "Copiar"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {semCodigo.length > 0 && (
          <p className="pt-1 text-xs text-muted-foreground">
            Ainda sem código:{" "}
            {semCodigo.map((n) => (
              <Badge key={n} variant="secondary" className="mr-1 text-[10px]">
                {n}
              </Badge>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
