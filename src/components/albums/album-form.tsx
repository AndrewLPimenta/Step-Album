"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  createAlbumAction,
  updateAlbumAction,
} from "@/server/actions/albums";
import {
  ALBUM_STATUS_LABELS,
  ALBUM_TYPE_LABELS,
  ALBUM_VALUES,
  ALL_ALBUM_STATUSES,
  ALL_ALBUM_TYPES,
} from "@/lib/constants";
import type {
  AlbumRow,
  AlbumStatus,
  AlbumType,
  UserRow,
} from "@/types/database";
import { formatBRL } from "@/lib/financial";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AlbumFormProps {
  mode: "create" | "edit";
  diagramadores: Pick<UserRow, "id" | "name">[];
  currentUserId: string;
  isAdmin: boolean;
  album?: AlbumRow;
}

export function AlbumForm({
  mode,
  diagramadores,
  currentUserId,
  isAdmin,
  album,
}: AlbumFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [studentName, setStudentName] = useState(album?.student_name ?? "");
  const [faculty, setFaculty] = useState(album?.faculty ?? "");
  const [classCode, setClassCode] = useState(album?.class_code ?? "");
  const [studentCode, setStudentCode] = useState(album?.student_code ?? "");
  const [type, setType] = useState<AlbumType>((album?.type ?? "colab") as AlbumType);
  const [responsibleId, setResponsibleId] = useState(
    album?.responsible_id ?? currentUserId,
  );
  const [status, setStatus] = useState<AlbumStatus>(
    (album?.status ?? "baixado") as AlbumStatus,
  );
  const [notes, setNotes] = useState(album?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        student_name: studentName,
        faculty,
        class_code: classCode || null,
        student_code: studentCode || null,
        type,
        responsible_id: responsibleId,
        status,
        notes: notes || null,
      };

      if (mode === "create") {
        const result = await createAlbumAction(payload);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Álbum criado!");
        router.push(`/albums/${result.data!.id}`);
      } else {
        const result = await updateAlbumAction({ id: album!.id, ...payload });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Álbum atualizado");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Novo álbum" : "Editar álbum"}
        </CardTitle>
        <CardDescription>
          Valor calculado automaticamente: {formatBRL(ALBUM_VALUES[type])}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Códigos */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="class_code">Cód. turma</Label>
              <Input
                id="class_code"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                disabled={isPending}
                maxLength={10}
                placeholder="31080"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student_code">Cód. formando</Label>
              <Input
                id="student_code"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                disabled={isPending}
                maxLength={10}
                placeholder="0913"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="student_name">Nome do formando</Label>
              <Input
                id="student_name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                disabled={isPending}
                maxLength={120}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="faculty">Turma / evento</Label>
            <Input
              id="faculty"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              required
              disabled={isPending}
              maxLength={120}
              placeholder="Ex: UNESA Medicina 2025"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Tipo do álbum</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as AlbumType)}
                disabled={isPending}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_ALBUM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ALBUM_TYPE_LABELS[t]} · {formatBRL(ALBUM_VALUES[t])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select
                value={responsibleId}
                onValueChange={setResponsibleId}
                disabled={isPending || !isAdmin}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {diagramadores.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isAdmin && (
                <p className="text-[10px] text-muted-foreground">
                  Apenas admins podem reatribuir.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as AlbumStatus)}
                disabled={isPending}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_ALBUM_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ALBUM_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              rows={3}
              maxLength={2000}
              placeholder="Anotações livres sobre o álbum..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Criar álbum" : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
