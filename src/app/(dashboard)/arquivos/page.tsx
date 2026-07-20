import { requireUser } from "@/lib/auth";
import { listArquivos } from "@/lib/queries";
import { ArquivoFormDialog } from "@/components/arquivos/arquivo-form-dialog";
import { ArquivosList } from "@/components/arquivos/arquivos-list";

export default async function ArquivosPage() {
  await requireUser();
  const arquivos = await listArquivos();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Arquivos</h1>
          <p className="text-sm text-muted-foreground">
            Links e arquivos compartilhados pela equipe.
          </p>
        </div>
        <ArquivoFormDialog />
      </div>

      <ArquivosList items={arquivos} />
    </div>
  );
}
