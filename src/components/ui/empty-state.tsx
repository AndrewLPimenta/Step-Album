import type { AppIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: AppIcon;
  title: string;
  /** Uma linha. Se der pra dizer QUAL recorte esta vazio (o ciclo, o filtro), diga. */
  description?: string;
  /** Botao, link — o proximo passo, quando existe um. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Estado vazio padrao. Antes cada tela resolvia com uma linha de texto solta
 * ("Nenhum álbum em andamento no momento."), sem icone e sem saida — o que e'
 * especialmente ruim na /fila, onde fila vazia e ciclo errado pareciam
 * exatamente a mesma coisa.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass flex flex-col items-center justify-center gap-3 border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      <div className="glass-chip flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
