"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Download, LogOut, PanelLeft, PanelLeftClose, Search } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  openCommandPalette,
  useCommandKeyLabel,
} from "@/components/layout/command-palette";
import { signOutAction } from "@/server/actions/auth";
import { initials } from "@/lib/utils";
import {
  NAV_GROUP_LABELS,
  navGroupForPathname,
  navLabelForPathname,
  USER_ROLE_LABELS,
} from "@/lib/constants";
import type { UserRole } from "@/types/database";

interface HeaderProps {
  name: string;
  email: string;
  role: UserRole;
  collapsed: boolean;
  /** "03 — 18 set" — o mesmo do chip da sidebar. */
  cycleLabel: string;
  onToggleSidebar: () => void;
}

export function Header({
  name,
  email,
  role,
  collapsed,
  cycleLabel,
  onToggleSidebar,
}: HeaderProps) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const cmdKey = useCommandKeyLabel();

  // Deriva do NAV_ITEMS. O mapa antigo tinha 7 entradas para 10 destinos, e
  // /sprint, /transferencias e /app ficavam sem titulo — justamente as telas
  // em que, no mobile, nao ha sidebar mostrando onde voce esta.
  const pageLabel = navLabelForPathname(pathname);
  const group = navGroupForPathname(pathname);

  return (
    // Barra flutuante em vez de colada no topo: a mesma materia dos cards,
    // com canto e um respiro em volta, pra a aurora aparecer por baixo.
    <header
      className="glass sticky z-30 mx-3 mt-3 flex h-14 items-center gap-2 rounded-[18px] px-2.5 md:mx-4 md:mt-4 md:gap-3 md:px-3"
      style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="hidden h-9 w-9 md:flex"
        onClick={onToggleSidebar}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? (
          <PanelLeft className="h-[18px] w-[18px] text-muted-foreground" weight="regular" />
        ) : (
          <PanelLeftClose className="h-[18px] w-[18px] text-muted-foreground" weight="regular" />
        )}
      </Button>

      {/* Trilha em vez de titulo solto: diz onde voce esta dentro do painel,
          nao so' o nome da tela. O nivel do meio e' o grupo do proprio
          NAV_ITEMS ("Operação", "Acompanhamento"...) — "Workspace" fixo nao
          dizia nada que a tela ja' nao dissesse. */}
      <nav aria-label="Trilha" className="min-w-0 truncate text-sm">
        <Link
          href="/dashboard"
          className="hidden rounded text-muted-foreground/70 transition-colors hover:text-foreground sm:inline"
        >
          StepAlbum
        </Link>
        {group && (
          <>
            <span className="hidden px-1.5 text-muted-foreground/40 sm:inline">
              /
            </span>
            <span className="hidden text-muted-foreground/70 lg:inline">
              {NAV_GROUP_LABELS[group]}
            </span>
            <span className="hidden px-1.5 text-muted-foreground/40 lg:inline">
              /
            </span>
          </>
        )}
        <span className="font-medium tracking-tight">{pageLabel}</span>
      </nav>

      <div className="flex-1" />

      {/* Gatilho do command palette. Era um campo de busca que so' sabia
          jogar o termo na /albums; o palette busca album E navega, entao o
          que fica aqui e' o gatilho — com o atalho a' vista, que e' como a
          pessoa aprende que ele existe. */}
      <button
        type="button"
        onClick={openCommandPalette}
        className="glass-field hidden h-9 items-center gap-2 rounded-xl pl-3 pr-2 text-left transition-colors hover:border-[hsl(var(--brand-blue)/0.35)] lg:flex lg:w-64 xl:w-72"
      >
        <Search
          className="h-4 w-4 shrink-0 text-muted-foreground/60"
          weight="regular"
          aria-hidden="true"
        />
        <span className="flex-1 truncate text-sm text-muted-foreground/70">
          Buscar ou navegar
        </span>
        <kbd className="shrink-0 rounded-md border border-[var(--chip-brd)] bg-[var(--chip)] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {cmdKey}K
        </kbd>
      </button>

      {/* Abaixo de lg o campo nao cabe — vira so' o icone, com o mesmo alvo
          de 44px dos demais botoes de icone. */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 lg:hidden"
        onClick={openCommandPalette}
        aria-label="Buscar ou navegar"
      >
        <Search className="h-[18px] w-[18px] text-muted-foreground" weight="regular" />
      </Button>

      <span className="glass-chip hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium xl:inline-flex">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "hsl(var(--success))" }}
          aria-hidden="true"
        />
        Ciclo {cycleLabel}
      </span>

      {/* Exporta o ciclo corrente em CSV. <a> simples, nao next/link: e' um
          download, nao uma navegacao de rota — o Link faria prefetch de um
          arquivo. */}
      <Button asChild size="sm" className="hidden sm:inline-flex">
        <a href="/api/export/ciclo">
          <Download className="h-4 w-4" weight="bold" aria-hidden="true" />
          Exportar
        </a>
      </Button>

      {/* No desktop o alternador de tema mora na sidebar; no mobile a
          sidebar nao existe, entao ele reaparece aqui. */}
      <span className="md:hidden">
        <ThemeToggle />
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 rounded-xl px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback
                className="text-[11px] font-semibold"
                style={{
                  background: "hsl(var(--brand-blue) / 0.12)",
                  color: "hsl(var(--ink-blue))",
                }}
              >
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                {USER_ROLE_LABELS[role]}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openCommandPalette()}>
            <Search className="mr-2 h-4 w-4" />
            Buscar ou navegar
            <span className="ml-auto text-xs text-muted-foreground">
              {cmdKey}K
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isPending}
            onSelect={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await signOutAction();
              });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
