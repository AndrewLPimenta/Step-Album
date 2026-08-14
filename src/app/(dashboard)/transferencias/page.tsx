import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TransferenciasPanel } from "@/components/transferencias/transferencias-panel";
import { Card, CardContent } from "@/components/ui/card";
import { HardDriveDownload } from "lucide-react";

export interface DispositivoDaEquipe {
  user_id: string;
  device_id: string;
  apelido: string | null;
  nome: string;
  eu: boolean;
}

export default async function TransferenciasPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  // Os dois vão por `as any`: misturar uma query tipada com outra não tipada
  // dentro do mesmo Promise.all faz o TS inferir `never` para a tipada, e aí
  // `u.id` vira erro. Anotar o resultado à mão resolve sem tocar no client.
  const [devicesRes, usersRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("sync_devices").select("user_id, device_id, apelido"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("users")
      .select("id, name")
      .eq("active", true)
      .order("name"),
  ]);

  const usuarios = (usersRes?.data ?? []) as { id: string; name: string }[];

  const nomePorId = new Map<string, string>(
    usuarios.map((u) => [u.id, u.name]),
  );

  const dispositivos: DispositivoDaEquipe[] = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((devicesRes?.data ?? []) as any[])
  )
    .map((d) => ({
      user_id: String(d.user_id),
      device_id: String(d.device_id),
      apelido: d.apelido ? String(d.apelido) : null,
      nome: nomePorId.get(String(d.user_id)) ?? "Alguém",
      eu: String(d.user_id) === profile.id,
    }))
    .sort((a, b) => (a.eu ? -1 : b.eu ? 1 : a.nome.localeCompare(b.nome, "pt-BR")));

  const meu = dispositivos.find((d) => d.eu) ?? null;
  const semCodigo = usuarios.filter(
    (u) => !dispositivos.some((d) => d.user_id === u.id),
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transferências</h1>
        <p className="text-sm text-muted-foreground">
          Os códigos que ligam as máquinas da equipe para trocar pastas de
          álbuns, de qualquer tamanho.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex gap-3 p-4">
          <HardDriveDownload className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Como funciona</p>
            <p className="text-muted-foreground">
              Rode o <code className="text-xs">INSTALAR_SYNCTHING.bat</code>, cole
              aqui o código que ele mostrar, e adicione os códigos dos outros no
              painel do Syncthing. Depois disso, pasta que entrar na pasta
              compartilhada aparece sozinha nas outras máquinas — sem limite de
              tamanho e sem abrir nada.
            </p>
          </div>
        </CardContent>
      </Card>

      <TransferenciasPanel
        meu={meu}
        dispositivos={dispositivos}
        semCodigo={semCodigo.map((u) => u.name)}
      />
    </div>
  );
}
