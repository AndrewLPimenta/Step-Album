import { Badge } from "@/components/ui/badge";
import {
  ALBUM_TYPE_LABELS,
  ALBUM_TYPE_STYLES,
  ALBUM_VALUES,
} from "@/lib/constants";
import { formatBRL } from "@/lib/financial";
import type { AlbumType } from "@/types/database";
import { cn } from "@/lib/utils";

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
      className={cn("font-medium border", ALBUM_TYPE_STYLES[type], className)}
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
