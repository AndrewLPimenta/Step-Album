import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AppIcon } from "@/lib/icons";
import { Sparkline } from "@/components/dashboard/sparkline";

interface StatCardProps {
  title: string;
  value: string | number;
  /** Sufixo do numero ("dias", "álbuns", "ativos") — some ao lado, menor. */
  unit?: string;
  /** Linha logo abaixo do numero, ao lado da variacao. */
  description?: string;
  icon?: AppIcon;
  trend?: { value: string; positive?: boolean };
  /**
   * Serie da micro-curva no rodape do card. Dois pontos ja' bastam; abaixo
   * disso o componente nao desenha nada em vez de desenhar uma reta que
   * sugere tendencia que nao existe.
   */
  spark?: number[];
  /**
   * Nota de rodape, separada por um fio — o detalhe que explica o numero sem
   * disputar espaco com ele ("123 baixado · 83 editando").
   */
  footnote?: string;
  /**
   * Tinta do rotulo e do halo. Alterne entre os dois numa fileira de KPIs
   * pra dar ritmo — nao ha significado semantico atrelado.
   */
  accent?: "blue" | "amber";
  /**
   * Se o numero tem uma tela por tras (faltam enviar -> /fila), passe o href:
   * o card inteiro vira alvo de clique. Um KPI que responde "23" e nao leva
   * a lugar nenhum obriga o usuario a procurar a tela no menu.
   */
  href?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  unit,
  description,
  icon: Icon,
  trend,
  spark,
  footnote,
  accent = "blue",
  href,
  className,
}: StatCardProps) {
  // Duas tintas separadas de proposito: o halo pode usar a cor de marca
  // pura (e' fundo), o rotulo nao — o ambar #FFBF00 da 1.65:1 sobre vidro
  // claro. --ink-* sao as versoes que passam em 4.5:1 nos dois temas.
  const tint =
    accent === "amber" ? "var(--brand-amber)" : "var(--brand-blue)";
  const ink = accent === "amber" ? "var(--ink-amber)" : "var(--ink-blue)";

  const body = (
    <>
      {/* Halo radial no canto superior direito — a mancha de cor que faz o
          card parecer iluminado por tras do vidro em vez de tingido. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full"
        style={{
          background: `radial-gradient(closest-side, hsl(${tint} / 0.2), transparent)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <p className="eyebrow" style={{ color: `hsl(${ink})` }}>
          {title}
        </p>
        {Icon && (
          <Icon
            className="h-4 w-4 shrink-0"
            weight="duotone"
            style={{ color: `hsl(${ink} / 0.6)` }}
          />
        )}
      </div>

      <p className="relative mt-3 flex items-baseline gap-1.5 font-display text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-foreground">
        {value}
        {unit && (
          <span className="text-sm font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </p>

      {(description || trend) && (
        <p className="relative mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium tabular-nums",
                trend.positive ? "text-success" : "text-destructive",
              )}
            >
              {/* Seta junto do sinal: variacao lida so' por cor some pra quem
                  nao distingue vermelho de verde (WCAG 1.4.1). */}
              <span aria-hidden="true">{trend.positive ? "↗" : "↘"}</span>
              {trend.value}
            </span>
          )}
          {description}
        </p>
      )}

      {spark && spark.length > 1 && (
        <Sparkline
          values={spark}
          stroke={`hsl(${tint})`}
          label={`Tendência de ${title.toLowerCase()}`}
          className="relative mt-4 h-7 w-full"
        />
      )}

      {footnote && (
        <p
          className={cn(
            "relative border-t border-[var(--brd)] pt-2.5 text-xs text-muted-foreground",
            spark && spark.length > 1 ? "mt-3" : "mt-4",
          )}
        >
          {footnote}
        </p>
      )}
    </>
  );

  const shell = cn(
    // .glass traz raio, borda, sombra e backdrop-filter (globals.css).
    // overflow-hidden e' o que segura o halo dentro do canto arredondado.
    "glass glass-interactive relative flex flex-col overflow-hidden p-5",
    href && "focus-ring block",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }

  return <div className={shell}>{body}</div>;
}
