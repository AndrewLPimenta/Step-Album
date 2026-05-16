"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 animate-fade-in max-w-md">
        <div className="text-7xl font-bold tracking-tight text-destructive/30">
          !
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Algo deu errado</h1>
          <p className="text-sm text-muted-foreground">
            Tente novamente. Se o problema persistir, fale com um admin.
          </p>
          {error.digest && (
            <p className="text-[10px] text-muted-foreground/50 mt-2 font-mono">
              ref: {error.digest}
            </p>
          )}
        </div>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </main>
  );
}
