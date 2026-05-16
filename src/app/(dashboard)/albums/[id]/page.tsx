import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAlbumById, listDiagramadores } from "@/lib/queries";
import { AlbumForm } from "@/components/albums/album-form";
import { ProblemsPanel } from "@/components/albums/problems-panel";
import { StatusBadge } from "@/components/albums/status-badge";
import { TypeBadge } from "@/components/albums/type-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet, CalendarClock } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/financial";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireUser();
  const result = await getAlbumById(id);
  if (!result) notFound();

  const { album, problems, responsible } = result;
  const diagramadores = await listDiagramadores();
  const isAdmin = profile.role === "admin";

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/albums">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {album.student_name}
            </h1>
            <StatusBadge status={album.status} />
            <TypeBadge type={album.type} showValue />
          </div>
          <p className="text-sm text-muted-foreground">
            {album.faculty} · Responsável:{" "}
            <span className="font-medium">
              {responsible?.name ?? "—"}
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <InfoCard
          icon={<Wallet className="h-4 w-4" />}
          label="Valor"
          value={formatBRL(album.value)}
          sub="definido pelo tipo"
        />
        <InfoCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Pagamento previsto"
          value={formatDate(album.payment_date)}
          sub={
            album.cycle_start && album.cycle_end
              ? `Ciclo ${formatDate(album.cycle_start)} → ${formatDate(album.cycle_end)}`
              : undefined
          }
        />
        <InfoCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Concluído em"
          value={album.completed_at ? formatDate(album.completed_at) : "—"}
          sub={`Criado em ${formatDate(album.created_at)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AlbumForm
            mode="edit"
            diagramadores={diagramadores}
            currentUserId={profile.id}
            isAdmin={isAdmin}
            album={album}
          />
        </div>
        <ProblemsPanel albumId={album.id} problems={problems} />
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
        {sub && (
          <CardDescription className="text-xs mt-1">{sub}</CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
