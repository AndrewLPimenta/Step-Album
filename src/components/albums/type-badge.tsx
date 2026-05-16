import { Badge } from "@/components/ui/badge";
import { ALBUM_TYPE_LABELS, ALBUM_VALUES } from "@/lib/constants";
import { formatBRL } from "@/lib/financial";
import type { AlbumType } from "@/types/database";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<AlbumType, string> = {
  colab:
    "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20",
  faculdade:
    "bg-[hsl(var(--brand-blue)/0.1)] text-[hsl(var(--brand-blue))] border-[hsl(var(--brand-blue)/0.2)]",
  especial:
    "bg-[hsl(var(--brand-amber)/0.1)] text-[hsl(var(--brand-amber))] border-[hsl(var(--brand-amber)/0.2)]",
  medicina:
    "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
};

export function TypeBadge({
  type,
  showValue = false,
  className,
}: {
  type: AlbumType;
  showValue?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border", TYPE_STYLES[type], className)}
    >
      {ALBUM_TYPE_LABELS[type]}
      {showValue && (
        <span className="ml-1.5 text-[10px] opacity-70">
          {formatBRL(ALBUM_VALUES[type])}
        </span>
      )}
    </Badge>
  );
}
