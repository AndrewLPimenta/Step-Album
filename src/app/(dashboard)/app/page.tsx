import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Apple,
  CheckCircle2,
  Download,
  MonitorDown,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

/**
 * O instalador do Windows mora em public/downloads e e' servido pelo
 * proprio app. Nao e' link publico: o middleware exige sessao, entao so'
 * quem esta' logado no StepAlbum baixa — que e' exatamente a equipe.
 *
 * Mac aponta pro GitHub Releases, porque .dmg so' sai de runner macOS
 * (workflow release-desktop.yml) — nao da' pra gerar no Windows.
 */
const RELEASES_URL =
  process.env.NEXT_PUBLIC_DESKTOP_RELEASES_URL ??
  "https://github.com/AndrewLPimenta/Step-Album/releases/latest";

const WINDOWS_URL =
  process.env.NEXT_PUBLIC_DESKTOP_WINDOWS_URL ?? "/downloads/StepAlbum-setup.exe";
const MAC_URL = process.env.NEXT_PUBLIC_DESKTOP_MAC_URL ?? RELEASES_URL;

const PASSOS = [
  {
    titulo: "Baixe e execute o instalador",
    texto:
      "São cerca de 2 MB. A instalação leva poucos segundos e não pede nada.",
  },
  {
    titulo: "O Windows vai reclamar — é esperado",
    texto:
      "Aparece uma tela azul dizendo que não reconhece o programa. Clique em \"Mais informações\" e depois em \"Executar assim mesmo\". Isso acontece porque o instalador não tem assinatura digital paga, não porque haja algo errado com ele.",
    alerta: true,
  },
  {
    titulo: "Abra pelo menu Iniciar",
    texto:
      "Procure por StepAlbum. Faça login uma vez e ele lembra da sessão.",
  },
];

export default async function AppPage() {
  await requireUser();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">App</h1>
        <p className="text-sm text-muted-foreground">
          O StepAlbum como programa de computador, em janela própria.
        </p>
      </div>

      {/* Dentro do Tauri, oferecer o download seria estranho. */}
      <div className="only-in-desktop">
        <Card className="border-[hsl(var(--brand-blue)/0.4)] bg-[hsl(var(--brand-blue)/0.05)]">
          <CardContent className="flex items-start gap-3 p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--brand-blue))]" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Você já está no app</p>
              <p className="text-sm text-muted-foreground">
                Esta página serve para instalar em outra máquina. Abra o
                StepAlbum pelo navegador nela e volte aqui.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="hide-in-desktop space-y-6">
        {/* ------------------------------------------------------ download */}
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MonitorDown className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold leading-none">StepAlbum Desktop</h2>
                <p className="text-sm text-muted-foreground">
                  Ícone no menu Iniciar, janela sem barra de endereço, alt-tab
                  como qualquer outro programa.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button asChild>
                {/* download: baixa em vez de o navegador tentar navegar */}
                <a href={WINDOWS_URL} download>
                  <Download />
                  Windows
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={MAC_URL} target="_blank" rel="noopener noreferrer">
                  <Apple />
                  macOS
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* -------------------------------------------------------- passos */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Como instalar</h2>
          {PASSOS.map((p, i) => (
            <Card key={p.titulo} className={p.alerta ? "border-amber-500/30" : undefined}>
              <CardContent className="flex gap-3 p-4">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    p.alerta
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.alerta ? <ShieldAlert className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{p.titulo}</p>
                  <p className="text-sm text-muted-foreground">{p.texto}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ---------------------------------------------------- atualizacao */}
        <Card>
          <CardContent className="flex gap-3 p-4">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Não precisa reinstalar nunca</p>
              <p className="text-sm text-muted-foreground">
                O app carrega o mesmo StepAlbum do navegador. Toda mudança
                publicada aparece nele na próxima vez que abrir — sem
                atualização, sem baixar de novo. Só vale rebaixar quando o
                próprio programa mudar (ícone, janela), o que é raro.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          O download exige estar logado — o link não funciona para quem não tem
          conta no StepAlbum. Windows 10 ou 11, 64 bits.
        </p>
      </div>
    </div>
  );
}
