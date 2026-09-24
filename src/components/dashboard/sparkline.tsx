interface SparklineProps {
  values: number[];
  /** Cor da linha — passe `hsl(var(--brand-blue))` ou similar. */
  stroke: string;
  className?: string;
  /** Sem area preenchida: usado quando o card ja' tem halo de cor. */
  flat?: boolean;
  label: string;
}

/**
 * Micro-grafico de tendencia dentro do card de KPI. SVG a mao em vez de
 * recharts: sao ~20 pontos num retangulo de 28px de altura, e o
 * ResponsiveContainer do recharts monta um observer de resize por instancia
 * — quatro deles no topo da pagina custavam mais que o grafico grande.
 *
 * `preserveAspectRatio="none"` deixa a curva esticar com o card sem precisar
 * medir largura no cliente.
 */
export function Sparkline({
  values,
  stroke,
  className,
  flat,
  label,
}: SparklineProps) {
  if (values.length < 2) return null;

  const W = 100;
  const H = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = W / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    // 2px de folga em cima e embaixo pra a linha nao encostar na borda.
    const y = H - 2 - ((v - min) / span) * (H - 4);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const id = `spark-${label.replace(/\W/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={label}
    >
      {!flat && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
