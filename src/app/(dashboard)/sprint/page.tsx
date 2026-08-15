import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computePaymentCycleForInstant, toDateOnly } from "@/lib/financial";
import {
  SPRINT_SETTINGS_PADRAO,
  STATUS_PENDENTES,
  montarPlano,
  type SprintAlbum,
  type SprintSettingsRow,
} from "@/lib/sprint";
import { SprintBoard } from "@/components/sprint/sprint-board";

export default async function SprintPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  const ciclo = computePaymentCycleForInstant(new Date());
  const inicioDoCiclo = toDateOnly(ciclo.cycleStart);

  const [albunsRes, settingsRes, folgasRes] = await Promise.all([
    // Mesmo recorte da /fila: só o ciclo atual. Sem isso entram álbuns
    // parados de ciclos antigos e a sprint mostra mais do que a fila —
    // ver CLAUDE.md, "O bug recorrente: /fila sumindo".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("albums")
      .select("id, student_name, class_code, student_code, faculty, type, status")
      .eq("responsible_id", profile.id)
      .eq("cycle_start", inicioDoCiclo)
      .in("status", STATUS_PENDENTES)
      .order("student_name"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("sprint_settings")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("sprint_days_off")
      .select("id, user_id, dia, motivo, created_at")
      .eq("user_id", profile.id),
  ]);

  const albuns = (albunsRes?.data ?? []) as SprintAlbum[];

  const settings: Pick<
    SprintSettingsRow,
    | "minutos_colab"
    | "minutos_faculdade"
    | "minutos_especial"
    | "minutos_medicina"
    | "horas_por_dia"
  > = settingsRes?.data ?? SPRINT_SETTINGS_PADRAO;

  const folgas = new Set<string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((folgasRes?.data ?? []) as any[]).map((f) => String(f.dia)),
  );

  // lastDay, não cycleEnd: cycleEnd é EXCLUSIVO (semente do ciclo seguinte).
  const plano = montarPlano({
    albuns,
    settings,
    cicloFim: ciclo.lastDay,
    folgas,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sprint</h1>
        <p className="text-sm text-muted-foreground">
          Seus álbuns do ciclo {ciclo.label}, repartidos pelos dias que faltam.
          Conforme você marca como enviado na Fila, eles saem daqui.
        </p>
      </div>

      <SprintBoard
        plano={plano}
        settings={settings}
        folgas={Array.from(folgas)}
      />
    </div>
  );
}
