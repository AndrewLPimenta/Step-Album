"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarOff, Loader2, Settings2, TriangleAlert } from "lucide-react";
import { ALBUM_TYPE_LABELS } from "@/lib/constants";
import {
  formatarDuracao,
  rotuloDoDia,
  type ContagemPorTipo,
  type SprintPlano,
  type SprintSettingsRow,
} from "@/lib/sprint";
import type { AlbumType } from "@/types/database";
import {
  toggleDayOffAction,
  upsertSprintSettingsAction,
} from "@/server/actions/sprint";

type Settings = Pick<
  SprintSettingsRow,
  | "minutos_colab"
  | "minutos_faculdade"
  | "minutos_especial"
  | "minutos_medicina"
  | "horas_por_dia"
>;

const ORDEM_TIPOS: AlbumType[] = ["medicina", "especial", "faculdade", "colab"];

const COR_TIPO: Record<AlbumType, string> = {
  medicina: "bg-[hsl(var(--brand-blue)/0.12)] text-[hsl(var(--brand-blue))]",
  especial: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  faculdade: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  colab: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

function Tipos({ porTipo }: { porTipo: ContagemPorTipo }) {
  const itens = ORDEM_TIPOS.filter((t) => (porTipo[t] ?? 0) > 0);
  if (itens.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {itens.map((t) => (
        <span
          key={t}
          className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${COR_TIPO[t]}`}
        >
          {porTipo[t]} {ALBUM_TYPE_LABELS[t]}
        </span>
      ))}
    </div>
  );
}

export function SprintBoard({
  plano,
  settings,
  folgas,
}: {
  plano: SprintPlano;
  settings: Settings;
  folgas: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // React 18.3.1 — sem useOptimistic. Override na mão, revertido se falhar.
  const [folgasLocal, setFolgasLocal] = useState<Set<string>>(new Set(folgas));
  const [abrirAjustes, setAbrirAjustes] = useState(false);
  const [form, setForm] = useState<Settings>(settings);

  const estourou = plano.sobra.length > 0;
  const sobrando = Math.max(0, plano.capacidadeMinutos - plano.totalMinutos);

  function alternarFolga(dia: string) {
    const eraFolga = folgasLocal.has(dia);
    setFolgasLocal((s) => {
      const n = new Set(s);
      if (eraFolga) n.delete(dia);
      else n.add(dia);
      return n;
    });
    startTransition(async () => {
      const r = await toggleDayOffAction(dia);
      if (!r.ok) {
        setFolgasLocal((s) => {
          const n = new Set(s);
          if (eraFolga) n.add(dia);
          else n.delete(dia);
          return n;
        });
        toast.error(r.error ?? "Não foi possível mudar o dia.");
        return;
      }
      router.refresh();
    });
  }

  function salvarAjustes() {
    startTransition(async () => {
      const r = await upsertSprintSettingsAction({
        minutos_colab: Number(form.minutos_colab),
        minutos_faculdade: Number(form.minutos_faculdade),
        minutos_especial: Number(form.minutos_especial),
        minutos_medicina: Number(form.minutos_medicina),
        horas_por_dia: Number(form.horas_por_dia),
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Ajustes salvos — a sprint foi redistribuída.");
      setAbrirAjustes(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------ resumo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Falta fazer</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {plano.totalAlbuns}
            </p>
            <div className="mt-1.5">
              <Tipos porTipo={plano.totalPorTipo} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Trabalho estimado</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatarDuracao(plano.totalMinutos)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {plano.diasUteis} dia(s) até o fim do ciclo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Capacidade</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatarDuracao(plano.capacidadeMinutos)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {form.horas_por_dia}h por dia útil
            </p>
          </CardContent>
        </Card>

        <Card
          className={estourou ? "border-destructive/40 bg-destructive/[0.04]" : undefined}
        >
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {estourou ? "Não cabe" : "Sobra"}
            </p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                estourou ? "text-destructive" : ""
              }`}
            >
              {estourou ? plano.sobra.length : formatarDuracao(sobrando)}
            </p>
            <div className="mt-1.5">
              {estourou ? (
                <Tipos porTipo={plano.sobraPorTipo} />
              ) : (
                <p className="text-xs text-muted-foreground">de folga no ciclo</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {estourou && (
        <Card className="border-destructive/40 bg-destructive/[0.04]">
          <CardContent className="flex gap-3 p-4">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {plano.sobra.length} álbum(ns) não cabem até o fim do ciclo.
              </span>{" "}
              São {formatarDuracao(plano.totalMinutos)} de trabalho para{" "}
              {formatarDuracao(plano.capacidadeMinutos)} de capacidade. Libere um
              dia de folga, aumente a jornada ou repasse álbuns.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------- ajustes */}
      <Card>
        <CardContent className="p-4">
          <button
            type="button"
            onClick={() => setAbrirAjustes((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Tempo por tipo de álbum e jornada
            </span>
            <span className="text-xs text-muted-foreground">
              {abrirAjustes ? "fechar" : "ajustar"}
            </span>
          </button>

          {abrirAjustes && (
            <div className="mt-4 space-y-4 border-t pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <CampoNumero label="Colab (min)" valor={form.minutos_colab}
                  onChange={(v) => setForm({ ...form, minutos_colab: v })} />
                <CampoNumero label="Faculdade (min)" valor={form.minutos_faculdade}
                  onChange={(v) => setForm({ ...form, minutos_faculdade: v })} />
                <CampoNumero label="Especial (min)" valor={form.minutos_especial}
                  onChange={(v) => setForm({ ...form, minutos_especial: v })} />
                <CampoNumero label="Medicina (min)" valor={form.minutos_medicina}
                  onChange={(v) => setForm({ ...form, minutos_medicina: v })} />
                <CampoNumero label="Horas por dia" valor={form.horas_por_dia}
                  step="0.5"
                  onChange={(v) => setForm({ ...form, horas_por_dia: v })} />
              </div>
              <Button size="sm" onClick={salvarAjustes} disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Salvar e redistribuir
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------- dias */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plano.dias.map((dia) => {
          const folga = folgasLocal.has(dia.data);
          const pct =
            dia.capacidadeMinutos > 0
              ? Math.min(100, (dia.minutos / dia.capacidadeMinutos) * 100)
              : 0;

          return (
            <Card
              key={dia.data}
              className={
                folga
                  ? "bg-muted/40"
                  : dia.hoje
                    ? "border-[hsl(var(--brand-blue)/0.5)]"
                    : undefined
              }
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {rotuloDoDia(dia.data)}
                  </span>
                  {dia.hoje && (
                    <Badge variant="secondary" className="text-[10px]">
                      hoje
                    </Badge>
                  )}
                </div>

                {folga ? (
                  <p className="py-5 text-center text-xs text-muted-foreground">
                    Folga
                  </p>
                ) : (
                  <>
                    <p className="text-2xl font-bold tabular-nums">
                      {dia.total}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        álbuns
                      </span>
                    </p>
                    <Tipos porTipo={dia.porTipo} />
                    <div className="space-y-1 pt-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background:
                              pct > 95
                                ? "hsl(var(--destructive))"
                                : "linear-gradient(90deg, hsl(var(--brand-blue)) 0%, hsl(var(--brand-amber)) 100%)",
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatarDuracao(dia.minutos)} de{" "}
                        {formatarDuracao(dia.capacidadeMinutos)}
                      </p>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => alternarFolga(dia.data)}
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                >
                  <CalendarOff className="h-3.5 w-3.5" />
                  {folga ? "vou trabalhar" : "não vou trabalhar"}
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CampoNumero({
  label,
  valor,
  onChange,
  step,
}: {
  label: string;
  valor: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min="0.5"
        step={step ?? "1"}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9"
      />
    </div>
  );
}
