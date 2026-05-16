import { requireUser } from "@/lib/auth";
import { listDiagramadores } from "@/lib/queries";
import { AlbumForm } from "@/components/albums/album-form";

export default async function NewAlbumPage() {
  const { profile } = await requireUser();
  const diagramadores = await listDiagramadores();

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo álbum</h1>
        <p className="text-sm text-muted-foreground">
          Preencha as informações abaixo. O valor é definido pelo tipo.
        </p>
      </div>
      <AlbumForm
        mode="create"
        diagramadores={diagramadores}
        currentUserId={profile.id}
        isAdmin={profile.role === "admin"}
      />
    </div>
  );
}
