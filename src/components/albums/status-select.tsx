"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAlbumStatusAction } from "@/server/actions/albums";
import {
  ALBUM_STATUS_DOT,
  ALBUM_STATUS_LABELS,
  ALL_ALBUM_STATUSES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AlbumStatus } from "@/types/database";
import { toast } from "sonner";

export function StatusSelect({
  albumId,
  status,
}: {
  albumId: string;
  status: AlbumStatus;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await updateAlbumStatusAction({
        id: albumId,
        status: value as AlbumStatus,
      });
      if (!result.ok) toast.error(result.error);
      else toast.success("Status atualizado");
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Status do álbum">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_ALBUM_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {/* O ponto vive dentro do ItemText de proposito: o Radix espelha
                esse conteudo no SelectValue, entao o gatilho ganha a cor do
                status sem precisar de um segundo mapa. Fica inline (nao flex)
                porque o gatilho aplica line-clamp-1 no filho direto. */}
            <span
              aria-hidden="true"
              className={cn(
                "mr-2 inline-block h-2 w-2 shrink-0 rounded-full align-middle",
                ALBUM_STATUS_DOT[s],
              )}
            />
            {ALBUM_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
