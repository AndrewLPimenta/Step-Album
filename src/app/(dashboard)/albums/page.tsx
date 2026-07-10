import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listAlbums, listDiagramadores } from "@/lib/queries";
import { AlbumsFilters } from "@/components/albums/albums-filters";
import {
  AlbumsTable,
  AlbumsPagination,
} from "@/components/albums/albums-table";
import { KazImportModal } from "@/components/albums/kaz-import-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { AlbumStatus, AlbumType } from "@/types/database";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    turma?: string;
    status?: string;
    type?: string;
    responsible?: string;
    problems?: string;
    page?: string;
  }>;
}

export default async function AlbumsPage({ searchParams }: PageProps) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const isAdmin = profile.role === "admin";

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [{ rows, total, pageSize }, diagramadores] = await Promise.all([
    listAlbums({
      q: sp.q,
      turma: sp.turma,
      status: sp.status as AlbumStatus | undefined,
      type: sp.type as AlbumType | undefined,
      responsibleId: sp.responsible,
      hasProblems:
        sp.problems === "yes" || sp.problems === "no" ? sp.problems : undefined,
      page,
      pageSize: 20,
    }),
    listDiagramadores(),
  ]);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Álbuns</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Todos os álbuns da equipe"
              : "Seus álbuns em produção"}
          </p>
        </div>
        <div className="flex gap-2">
          <KazImportModal
            diagramadores={diagramadores}
            currentUserId={profile.id}
            isAdmin={isAdmin}
          />
          <Button asChild>
            <Link href="/albums/new">
              <Plus className="h-4 w-4" />
              Novo álbum
            </Link>
          </Button>
        </div>
      </div>

      <AlbumsFilters
        diagramadores={diagramadores}
        showResponsibleFilter={isAdmin}
      />

      <AlbumsTable rows={rows} isAdmin={isAdmin} />

      <AlbumsPagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
