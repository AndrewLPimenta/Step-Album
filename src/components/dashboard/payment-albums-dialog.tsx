"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDate } from "@/lib/financial";
import { ALBUM_STATUS_LABELS, ALBUM_TYPE_LABELS } from "@/lib/constants";
import type { PaymentAlbumItem } from "@/lib/queries";
import type { AlbumStatus } from "@/types/database";
import { ChevronRight } from "lucide-react";

export type { PaymentAlbumItem };

const STATUS_COLORS: Record<AlbumStatus, string> = {
  baixado: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  editando: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  montado: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  enviado: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  concluido: "bg-green-500/15 text-green-600 dark:text-green-400",
  descartado: "bg-red-500/15 text-red-600 dark:text-red-400",
  fotos_insuficientes: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  duplicado: "bg-slate-400/15 text-slate-500 dark:text-slate-400",
};

interface Props {
  date: string;
  total: number;
  count: number;
  albums: PaymentAlbumItem[];
  trigger: React.ReactNode;
}

export function PaymentAlbumsDialog({ date, total, count, albums, trigger }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Álbuns · {formatDate(date)}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {count} álbum{count !== 1 ? "ns" : ""} · {formatBRL(total)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-2">
          {albums.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 px-3.5 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.student_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {a.responsibleName}
                  {a.class_code && (
                    <span className="ml-1 opacity-60">· {a.class_code}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {ALBUM_TYPE_LABELS[a.type]}
                </span>
                <Badge
                  className={`text-[10px] px-1.5 py-0.5 border-0 font-medium ${STATUS_COLORS[a.status]}`}
                >
                  {ALBUM_STATUS_LABELS[a.status]}
                </Badge>
                <span className="text-xs font-semibold tabular-nums w-12 text-right">
                  {formatBRL(a.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentAlbumsButton({
  date,
  total,
  count,
  albums,
}: Omit<Props, "trigger">) {
  return (
    <PaymentAlbumsDialog
      date={date}
      total={total}
      count={count}
      albums={albums}
      trigger={
        <button className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          <ChevronRight className="h-3 w-3" />
          ver álbuns
        </button>
      }
    />
  );
}
