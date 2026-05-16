"use client";

import { useTransition } from "react";
import { updateAlbumAction } from "@/server/actions/albums";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
}

interface ReassignSelectProps {
  albumId: string;
  currentUserId: string;
  users: User[];
}

export function ReassignSelect({ albumId, currentUserId, users }: ReassignSelectProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newUserId = e.target.value;
    if (newUserId === currentUserId) return;
    startTransition(async () => {
      const result = await updateAlbumAction({ id: albumId, responsible_id: newUserId });
      if (result.ok) {
        toast.success("Álbum reatribuído.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <select
      defaultValue={currentUserId}
      onChange={handleChange}
      disabled={isPending}
      className="text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground disabled:opacity-50 cursor-pointer hover:border-primary/50 transition-colors"
    >
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </select>
  );
}
