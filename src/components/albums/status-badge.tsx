import { Badge } from "@/components/ui/badge";
import {
  ALBUM_STATUS_BORDER_STYLES,
  ALBUM_STATUS_LABELS,
} from "@/lib/constants";
import type { AlbumStatus } from "@/types/database";
import { cn } from "@/lib/utils";

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
        ALBUM_STATUS_BORDER_STYLES[status],
        className,
      )}
    >
      {ALBUM_STATUS_LABELS[status]}
    </Badge>
  );
}
