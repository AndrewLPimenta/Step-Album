import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 animate-fade-in">
        <div className="text-7xl font-bold tracking-tight text-muted-foreground/30">
          404
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Página não encontrada</h1>
          <p className="text-sm text-muted-foreground">
            O recurso que você procura não existe ou foi movido.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Voltar ao painel</Link>
        </Button>
      </div>
    </main>
  );
}
