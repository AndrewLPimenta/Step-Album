import { cn } from "@/lib/utils";

export function MetricList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // Fio de 1px entre as linhas, nada em volta: o cartao que as contem ja'
  // desenha a borda. Uma tabela de valores nao precisa de duas molduras.
  return (
    <div className={cn("divide-y divide-[var(--brd)]", className)}>
      {children}
    </div>
  );
}

interface MetricRowProps {
  label: string;
  /** Numero ja' formatado — "R$ 1.080,00", "123", "15,8%". */
  value: string;
  /** Segunda informacao da direita, menor: "32%", "108 álbuns". */
  note?: string;
  /** Variacao assinada, ja' formatada: "+12%", "-57%". */
  delta?: { text: string; positive: boolean };
  /** Token de cor do ponto a' esquerda, ex. "--status-active". */
  token?: string;
  /**
   * 0..1 — pinta uma faixa de fundo proporcional atras da linha. Substitui a
   * barra empilhada embaixo do rotulo: mesma leitura de proporcao, metade da
   * altura, e a linha continua sendo uma linha de tabela.
   */
  ratio?: number;
}

export function MetricRow({
  label,
  value,
  note,
  delta,
  token,
  ratio,
}: MetricRowProps) {
  return (
    <div className="relative flex items-center gap-3 overflow-hidden py-2.5">
      {ratio !== undefined && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 left-0 rounded-[5px]"
          style={{
            width: `${Math.max(1.5, ratio * 100)}%`,
            background: token
              ? `hsl(var(${token}) / 0.13)`
              : "hsl(var(--brand-blue) / 0.12)",
          }}
        />
      )}
      {token && (
        <span
          aria-hidden="true"
          className="relative h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: `hsl(var(${token}))` }}
        />
      )}
      <span className="relative min-w-0 flex-1 truncate text-sm text-foreground/85">
        {label}
      </span>
      {note && (
        <span className="relative shrink-0 text-xs tabular-nums text-muted-foreground">
          {note}
        </span>
      )}
      {delta && (
        <span
          className={cn(
            "relative shrink-0 text-xs font-medium tabular-nums",
            delta.positive ? "text-success" : "text-destructive",
          )}
        >
          {delta.text}
        </span>
      )}
      <span className="relative shrink-0 text-sm font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}
