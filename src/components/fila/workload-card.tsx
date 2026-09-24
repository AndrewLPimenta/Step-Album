import { ALBUM_STATUS_LABELS } from "@/lib/constants";
import type { AlbumStatus } from "@/types/database";

export interface WorkloadSlice {
  status: AlbumStatus;
  count: number;
  token: string;
}

/**
 * Carga de uma pessoa no ciclo. A versao anterior empilhava uma pilula por
 * status embaixo do nome: tres linhas de altura variavel, entao os cards da
 * grade nunca ficavam do mesmo tamanho, e comparar duas pessoas exigia ler
 * seis numeros.
 *
 * A barra segmentada resolve as duas coisas — altura fixa e a proporcao
 * visivel de relance. Os numeros continuam escritos embaixo porque cor
 * sozinha nao e' informacao acessivel (WCAG 1.4.1).
 */
export function WorkloadCard({
  name,
  total,
  slices,
}: {
  name: string;
  total: number;
  slices: WorkloadSlice[];
}) {
  return (
    <div className="glass flex flex-col p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium">{name}</span>
        <span className="font-display text-2xl font-semibold leading-none tabular-nums">
          {total}
        </span>
      </div>

      <div
        className="progress-track mt-3 flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-[var(--chip)]"
        role="img"
        aria-label={
          total === 0
            ? "Sem álbuns"
            : slices
                .map(
                  (s) => `${s.count} ${ALBUM_STATUS_LABELS[s.status].toLowerCase()}`,
                )
                .join(", ")
        }
      >
        {slices.map((s) => (
          <span
            key={s.status}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(s.count / Math.max(1, total)) * 100}%`,
              background: `hsl(var(${s.token}))`,
            }}
          />
        ))}
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
        {total === 0
          ? "Nenhum álbum na fila"
          : slices
              .map(
                (s) => `${s.count} ${ALBUM_STATUS_LABELS[s.status].toLowerCase()}`,
              )
              .join(" · ")}
      </p>
    </div>
  );
}
