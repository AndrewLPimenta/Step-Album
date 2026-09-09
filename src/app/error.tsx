"use client";

import { useEffect, useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  async function copiarRef() {
    if (!error.digest) return;
    try {
      await navigator.clipboard.writeText(error.digest);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard bloqueada (contexto inseguro, permissao negada): a ref
      // continua selecionavel na tela, entao nao ha nada a informar aqui.
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md space-y-5 text-center animate-fade-in">
        {/* Era um "!" de 7xl em opacidade 30%: ocupava o topo inteiro da tela
            sem dizer nada. O que a pessoa precisa daqui e' a ref, que antes
            era o elemento menos legivel da pagina. */}
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold">Algo deu errado</h1>
          <p className="text-sm text-muted-foreground">
            Tente novamente. Se continuar, mande a referência abaixo pra um
            admin — é por ela que dá pra achar o erro no log.
          </p>
        </div>

        {error.digest && (
          <div className="flex items-center justify-center gap-2">
            <code className="select-all rounded-md bg-muted px-2.5 py-1 font-mono text-xs text-foreground/80">
              {error.digest}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={copiarRef}
              aria-label="Copiar referência do erro"
            >
              {copiado ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </main>
  );
}
