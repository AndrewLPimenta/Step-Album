import { Badge } from "@/components/ui/badge";
import { ALBUM_STATUS_LABELS } from "@/lib/constants";
import type { AlbumStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<AlbumStatus, string> = {
  baixado:
    "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30",
  editando:
    "bg-[hsl(var(--brand-blue)/0.12)] text-[hsl(var(--brand-blue))] border-[hsl(var(--brand-blue)/0.3)]",
  descartado:
    "bg-[hsl(var(--brand-amber)/0.12)] text-[hsl(var(--brand-amber))] border-[hsl(var(--brand-amber)/0.3)]",
  montado:
    "bg-warning/15 text-warning border-warning/30",
  enviado:
    "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  concluido:
    "bg-success/15 text-success border-success/30",
  fotos_insuficientes:
    "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  duplicado:
    "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

export function StatusBadge({
  status,
  className,
}: {
  status: AlbumStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2 py-0.5 font-medium border",
        STATUS_STYLES[status],
        className,
      )}
    >
      {ALBUM_STATUS_LABELS[status]}
    </Badge>
  );
}
