import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AppIcon } from "@/lib/icons";

interface StatCardProps {
  title: string;
  value: string | number;
  /** Sufixo do numero ("dias", "álbuns", "ativos") — some ao lado, menor. */
  unit?: string;
  description?: string;
  icon?: AppIcon;
  trend?: { value: string; positive?: boolean };
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
          background: `radial-gradient(closest-side, hsl(${tint} / 0.22), transparent)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <p
          className="text-[9.5px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: `hsl(${ink})` }}
        >
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
                "font-medium tabular-nums",
                trend.positive ? "text-success" : "text-destructive",
              )}
            >
              {trend.value}
            </span>
          )}
          {description}
        </p>
      )}
    </>
  );

  const shell = cn(
    // .glass traz raio, borda, sombra e backdrop-filter (globals.css).
    // overflow-hidden e' o que segura o halo dentro do canto arredondado.
    "glass relative block overflow-hidden p-5 transition-transform duration-200",
    href ? "hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "hover:-translate-y-0.5",
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
