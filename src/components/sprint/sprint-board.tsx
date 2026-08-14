"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarOff, Check, Loader2, Settings2, TriangleAlert } from "lucide-react";
import { ALBUM_TYPE_LABELS } from "@/lib/constants";
import {
  formatarDuracao,
  rotuloDoDia,
  type SprintPlano,
  type SprintSettingsRow,
} from "@/lib/sprint";
import {
  checkSprintAlbumAction,
  toggleDayOffAction,
  upsertSprintSettingsAction,
} from "@/server/actions/sprint";
import type { AlbumStatus } from "@/types/database";

type Settings = Pick<
  SprintSettingsRow,
  | "minutos_colab"
  | "minutos_faculdade"
  | "minutos_especial"
  | "minutos_medicina"
  | "horas_por_dia"
  | "status_do_check"
>;

const STATUS_CHECK_OPCOES: { valor: AlbumStatus; label: string; nota: string }[] = [
  { valor: "enviado", label: "Enviado", nota: "fecha o ciclo financeiro" },
  { valor: "montado", label: "Montado", nota: "não mexe no financeiro" },
  { valor: "editando", label: "Editando", nota: "só avança a etapa" },
  { valor: "concluido", label: "Concluído", nota: "sai da fila de vez" },
];

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

  // React 18.3.1 aqui — não existe useOptimistic. O override otimista é na
  // mão: guarda o que mudou, e desfaz se a action falhar.
  const [feitos, setFeitos] = useState<Set<string>>(new Set());
  const [folgasLocal, setFolgasLocal] = useState<Set<string>>(new Set(folgas));
  const [abrirAjustes, setAbrirAjustes] = useState(false);
  const [form, setForm] = useState<Settings>(settings);

  const estourou = plano.sobra.length > 0;

  const restante = useMemo(
    () => plano.totalAlbuns - feitos.size,
    [plano.totalAlbuns, feitos],
  );

  function marcar(albumId: string) {
    setFeitos((s) => new Set(s).add(albumId));
    startTransition(async () => {
      const r = await checkSprintAlbumAction(albumId);
      if (!r.ok) {
        setFeitos((s) => {
          const n = new Set(s);
          n.delete(albumId);
          return n;
        });
        toast.error(r.error ?? "Não foi possível atualizar.");
        return;
      }
      router.refresh();
    });
  }

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
        status_do_check: form.status_do_check as
          | "editando"
          | "montado"
          | "enviado"
          | "concluido",
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
        <Metrica titulo="Álbuns na sprint" valor={String(restante)}
                 nota={feitos.size > 0 ? `${feitos.size} feito(s) agora` : "pendentes no ciclo"} />
        <Metrica titulo="Trabalho estimado" valor={formatarDuracao(plano.totalMinutos)}
                 nota={`${plano.diasUteis} dia(s) útil(eis)`} />
        <Metrica titulo="Capacidade" valor={formatarDuracao(plano.capacidadeMinutos)}
                 nota="dias restantes × jornada" />
        <Metrica
          titulo={estourou ? "Não cabe" : "Folga"}
          valor={
            estourou
              ? `${plano.sobra.length} álbum(ns)`
              : formatarDuracao(Math.max(0, plano.capacidadeMinutos - plano.totalMinutos))
          }
          nota={estourou ? "passou do fim do ciclo" : "sobra de capacidade"}
          alerta={estourou}
        />
      </div>

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
                <CampoNumero label="Horas por dia" valor={form.horas_por_dia} step="0.5"
                  onChange={(v) => setForm({ ...form, horas_por_dia: v })} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Ao marcar o check, o álbum vira</Label>
                <Select
                  value={form.status_do_check}
                  onValueChange={(v) =>
                    setForm({ ...form, status_do_check: v as AlbumStatus })
                  }
                >
                  <SelectTrigger className="h-9 w-full sm:w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_CHECK_OPCOES.map((o) => (
                      <SelectItem key={o.valor} value={o.valor}>
                        {o.label} — {o.nota}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button size="sm" onClick={salvarAjustes} disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Salvar e redistribuir
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {estourou && (
        <Card className="border-destructive/40 bg-destructive/[0.04]">
          <CardContent className="flex gap-3 p-4">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {plano.sobra.length} álbum(ns) não cabem até o fim do ciclo.
              </p>
              <p className="text-muted-foreground">
                Com {formatarDuracao(plano.capacidadeMinutos)} de capacidade para{" "}
                {formatarDuracao(plano.totalMinutos)} de trabalho. Libere um dia de
                folga, aumente a jornada ou repasse álbuns para outra pessoa.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------- dias */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plano.dias.map((dia) => {
          const folga = folgasLocal.has(dia.data);
          const pendentes = dia.albuns.filter((a) => !feitos.has(a.id));
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {rotuloDoDia(dia.data)}
                    </span>
                    {dia.hoje && (
                      <Badge variant="secondary" className="text-[10px]">
                        hoje
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => alternarFolga(dia.data)}
                    disabled={isPending}
                    title={folga ? "Voltar a trabalhar neste dia" : "Marcar como folga"}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                  >
                    <CalendarOff className="h-3.5 w-3.5" />
                    {folga ? "folga" : "marcar folga"}
                  </button>
                </div>

                {folga ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Dia de folga — o trabalho foi jogado para os outros dias.
                  </p>
                ) : (
                  <>
                    <div className="space-y-1">
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
                        {formatarDuracao(dia.capacidadeMinutos)} · {pendentes.length}{" "}
                        pendente(s)
                      </p>
                    </div>

                    {dia.albuns.length === 0 ? (
                      <p className="py-3 text-center text-xs text-muted-foreground">
                        Nada agendado.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {dia.albuns.map((a) => {
                          const feito = feitos.has(a.id);
                          return (
                            <li
                              key={a.id}
                              className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-sm ${
                                feito ? "opacity-40" : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => !feito && marcar(a.id)}
                                disabled={feito || isPending}
                                title="Marcar como feito"
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                  feito
                                    ? "border-transparent bg-primary text-primary-foreground"
                                    : "border-input hover:border-primary"
                                }`}
                              >
                                {feito && <Check className="h-3 w-3" />}
                              </button>
                              <span
                                className={`min-w-0 flex-1 truncate ${
                                  feito ? "line-through" : ""
                                }`}
                                title={a.student_name}
                              >
                                {a.student_name}
                              </span>
                              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {ALBUM_TYPE_LABELS[a.type]}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ------------------------------------------------------ sobra */}
      {estourou && (
        <Card className="border-dashed">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">Fora da sprint</p>
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {plano.sobra.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 truncate text-sm text-muted-foreground"
                >
                  <span className="truncate">{a.student_name}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide">
                    {ALBUM_TYPE_LABELS[a.type]}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metrica({
  titulo,
  valor,
  nota,
  alerta,
}: {
  titulo: string;
  valor: string;
  nota: string;
  alerta?: boolean;
}) {
  return (
    <Card className={alerta ? "border-destructive/40 bg-destructive/[0.04]" : undefined}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p
          className={`mt-1 text-2xl font-bold tabular-nums ${
            alerta ? "text-destructive" : ""
          }`}
        >
          {valor}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>
      </CardContent>
    </Card>
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
