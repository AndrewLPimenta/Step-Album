"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NAV_GROUP_LABELS,
  NAV_GROUP_ORDER,
  navItemsForRole,
} from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserRole } from "@/types/database";

interface BottomNavProps {
  role: UserRole;
}

/**
 * Barra inferior do mobile: 4 destinos fixos + "Mais".
 *
 * Antes ela renderizava TODOS os NAV_ITEMS com flex-1 — 9 itens, ou 10 para
 * criador. Num aparelho de 375px isso da ~37px por item, abaixo dos 44px
 * minimos de alvo de toque, com rotulo em 10px truncado: "Transferencias",
 * "Financeiro" e "Dashboard" nao cabiam e viravam pedaco de palavra.
 *
 * Com 5 slots sao 75px cada, os rotulos cabem inteiros e cada alvo passa dos
 * 44px de altura e de largura.
 */
export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);

  const nav = navItemsForRole(role);
  const principais = nav.filter((item) => item.primary);
  const restantes = nav.filter((item) => !item.primary);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  // "Mais" fica destacado quando a tela atual mora dentro dele — senao a
  // pessoa perde a referencia de onde esta ao navegar pelo sheet.
  const maisAtivo = restantes.some((item) => isActive(item.href));

  const gruposRestantes = NAV_GROUP_ORDER.map((g) => ({
    group: g,
    items: restantes.filter((item) => item.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navegação principal"
      >
        <div className="flex items-stretch">
          {principais.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors",
                  active
                    ? "text-[hsl(var(--brand-blue))]"
                    : "text-muted-foreground",
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[hsl(var(--brand-amber))]" />
                )}
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-[11px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMaisAberto(true)}
            aria-haspopup="dialog"
            aria-expanded={maisAberto}
            className={cn(
              "relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors",
              maisAtivo
                ? "text-[hsl(var(--brand-blue))]"
                : "text-muted-foreground",
            )}
          >
            {maisAtivo && (
              <span className="absolute top-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[hsl(var(--brand-amber))]" />
            )}
            <MoreHorizontal className="h-5 w-5 shrink-0" />
            <span className="text-[11px] font-medium leading-none">Mais</span>
          </button>
        </div>
      </nav>

      <Dialog open={maisAberto} onOpenChange={setMaisAberto}>
        {/* Sheet vindo de baixo: o DialogContent e' centralizado por padrao,
            entao as classes de posicao sao sobrescritas aqui (o cn usa
            tailwind-merge, entao left-0/top-auto vencem left-[50%]/top-[50%]). */}
        <DialogContent
          className="left-0 right-0 top-auto bottom-0 max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-0 sm:rounded-t-2xl md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <span className="h-1 w-9 rounded-full bg-border" aria-hidden="true" />
          </div>
          <DialogTitle className="px-5 pb-3 pt-1 text-sm font-semibold">
            Mais
          </DialogTitle>

          <div className="max-h-[60vh] overflow-y-auto px-3 pb-4">
            {gruposRestantes.map(({ group, items }, gi) => (
              <div key={group} className={cn(gi > 0 && "mt-3")}>
                <div className="px-3 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/45">
                  {NAV_GROUP_LABELS[group]}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMaisAberto(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-[2.75rem] items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                          active
                            ? "bg-[hsl(var(--brand-blue)/0.1)] font-medium text-[hsl(var(--brand-blue))] dark:bg-accent dark:text-accent-foreground"
                            : "text-foreground/80 hover:bg-accent/60",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            !active && "text-muted-foreground/70",
                          )}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
