import Link from "next/link";
import { ChevronRight } from "@/lib/icons";
import { cn } from "@/lib/utils";

export interface FlowStep {
  status: string;
  label: string;
  count: number;
  token: string;
}

/**
 * As cinco etapas na horizontal, com a taxa de passagem entre elas.
 *
 * A versao anterior eram cinco barras horizontais empilhadas — legiveis, mas
 * lendo como "cinco categorias independentes". Sao etapas de um mesmo
 * caminho: o que interessa nao e' so' o tamanho de cada uma, e' onde a fila
 * para de andar. A porcentagem entre dois passos e' o que responde isso.
 */
export function FlowFunnel({ steps }: { steps: FlowStep[] }) {
  const max = Math.max(1, ...steps.map((s) => s.count));

  return (
    <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {steps.map((step, i) => {
        const prev = steps[i - 1];
        // Passagem = quantos do passo anterior ja' chegaram aqui. Acima de
        // 100% significa que entrou trabalho novo direto nesta etapa.
        const pass =
          prev && prev.count > 0
            ? Math.round((step.count / prev.count) * 100)
            : null;

        return (
          <li key={step.status} className="relative">
            <Link
              href={`/albums?status=${step.status}`}
              className="glass-sunken focus-ring block rounded-2xl p-3.5 transition-[background,transform] duration-200 hover:-translate-y-px hover:bg-[hsl(var(--brand-blue)/0.07)]"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: `hsl(var(${step.token}))` }}
                />
                <span className="eyebrow truncate text-muted-foreground">
                  {step.label}
                </span>
              </div>
              <p className="mt-2.5 font-display text-2xl font-semibold leading-none tabular-nums">
                {step.count}
              </p>
              {/* Trilho proporcional ao maior passo — da' a silhueta do funil
                  de relance, sem precisar comparar cinco numeros. */}
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[var(--chip)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, (step.count / max) * 100)}%`,
                    background: `hsl(var(${step.token}))`,
                  }}
                />
              </div>
              <p
                className={cn(
                  "mt-2 text-[11px] tabular-nums",
                  pass !== null && pass < 50
                    ? "text-[hsl(var(--status-problem))]"
                    : "text-muted-foreground",
                )}
              >
                {pass === null
                  ? "início do fluxo"
                  : `${pass}% do passo anterior`}
              </p>
            </Link>

            {/* Seta entre os passos — so' na linha de 5, onde eles ficam de
                fato lado a lado. */}
            {i < steps.length - 1 && (
              <ChevronRight
                aria-hidden="true"
                weight="bold"
                className="absolute -right-[13px] top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/30 lg:block"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
