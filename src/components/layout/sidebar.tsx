"use client";

import * as React from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, MonitorDown } from "@/lib/icons";
import { cn } from "@/lib/utils";
import {
  NAV_ITEMS,
  SIDEBAR_FOOTER_HREF,
  SIDEBAR_TREE,
  navItemsForRole,
  type NavItem,
  type SidebarNode,
} from "@/lib/constants";
import type { UserRole } from "@/types/database";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { CycleSummary } from "@/components/layout/dashboard-shell";

interface SidebarProps {
  role: UserRole;
  collapsed: boolean;
  cycle: CycleSummary;
}

export function Sidebar({ role, collapsed, cycle }: SidebarProps) {
  const pathname = usePathname();
  const allowed = new Set(navItemsForRole(role).map((i) => i.href));
  const byHref = new Map(NAV_ITEMS.map((i) => [i.href, i]));

  // Contagem por destino. Hoje so' a /fila tem uma — e' o unico numero que
  // muda o que voce faz a seguir sem precisar abrir a tela.
  const badges: Record<string, number> = { "/fila": cycle.pending };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  // Nos do menu que o papel atual pode ver, ja' sem grupos que ficaram vazios.
  const nodes: SidebarNode[] = SIDEBAR_TREE.map((n) =>
    n.kind === "group"
      ? { ...n, children: n.children.filter((h) => allowed.has(h)) }
      : n,
  ).filter((n) =>
    n.kind === "group" ? n.children.length > 0 : allowed.has(n.href),
  );

  // Abertura manual dos grupos. O padrao (undefined) segue a rota: o grupo
  // que contem a tela atual ja' nasce aberto, sem precisar de clique.
  const [manual, setManual] = useState<Record<string, boolean>>({});

  const footer = byHref.get(SIDEBAR_FOOTER_HREF);

  return (
    <aside
      className={cn(
        // Painel flutuante, nao coluna colada na borda: canto de 22px e
        // uma folga de 12px em volta, pra a aurora passar por tras e por
        // baixo. No app desktop (Tauri) o seletor .app-sidebar em
        // globals.css zera esse fundo pra deixar passar a vibrancy nativa.
        "app-sidebar glass hidden md:flex md:flex-col md:fixed md:left-3 md:top-3 md:bottom-3 z-40 rounded-[22px] overflow-hidden transition-[width] duration-300",
        collapsed ? "md:w-[4.5rem]" : "md:w-64",
      )}
    >
      {/* Logo — also doubles as the window drag handle in the desktop app
          (data-tauri-drag-region is a no-op in a normal browser tab; only
          the Tauri shell honors it, for the traffic-light overlay title bar). */}
      <div
        data-tauri-drag-region
        className={cn(
          "app-sidebar-logo relative flex h-[4.5rem] shrink-0 items-center gap-2.5 px-4 transition-all duration-300",
          collapsed && "justify-center px-0",
        )}
      >
        {/* Sem moldura em volta: a marca ja' e' um simbolo fechado, e o
            quadradinho de vidro so' a encolhia. */}
        <Image
          src="/logo-stepalbum.svg"
          alt="StepAlbum"
          width={collapsed ? 34 : 40}
          height={collapsed ? 34 : 40}
          className="shrink-0"
        />
        {!collapsed && (
          <>
            <div className="flex min-w-0 flex-col leading-none">
              <span className="truncate font-display text-[17px] font-semibold tracking-tight">
                StepAlbum
              </span>
              <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
                Produção
              </span>
            </div>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </>
        )}
      </div>

      {/* Chip do ciclo — responde "em que ciclo estamos e qual o tamanho
          dele" em toda tela, nao so' no dashboard. */}
      {!collapsed && (
        <Link
          href="/fila"
          className="glass-chip mx-3 mb-2 flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-transform hover:-translate-y-px"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: "hsl(var(--success))" }}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium leading-tight">
              Ciclo {cycle.label}
            </span>
            <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
              {cycle.albums} álbu{cycle.albums === 1 ? "m" : "ns"} ·{" "}
              {cycle.people} pessoa{cycle.people === 1 ? "" : "s"}
            </span>
          </span>
        </Link>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {collapsed
          ? // Recolhida vira lista plana de icones: submenu dentro de uma
            // coluna de 72px viraria flyout, e flyout aninhado em hover e'
            // exatamente o padrao que a versao expandida evita.
            nodes
              .flatMap((n) =>
                n.kind === "group"
                  ? n.children.map((h) => byHref.get(h))
                  : [byHref.get(n.href)],
              )
              .filter((i): i is NavItem => !!i)
              .map((item) => (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <NavLink
                      item={item}
                      active={isActive(item.href)}
                      badge={badges[item.href]}
                      collapsed
                    />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                    {badges[item.href] ? ` · ${badges[item.href]}` : ""}
                  </TooltipContent>
                </Tooltip>
              ))
          : nodes.map((node) => {
              if (node.kind === "item") {
                const item = byHref.get(node.href);
                if (!item) return null;
                return (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    badge={badges[item.href]}
                  />
                );
              }

              const children = node.children
                .map((h) => byHref.get(h))
                .filter((i): i is NavItem => !!i);
              const hasActiveChild = children.some((c) => isActive(c.href));
              const open = manual[node.id] ?? hasActiveChild;
              const GroupIcon = node.icon;
              const groupBadge = children.reduce(
                (sum, c) => sum + (badges[c.href] ?? 0),
                0,
              );

              return (
                <div key={node.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() =>
                      setManual((m) => ({ ...m, [node.id]: !open }))
                    }
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm transition-all duration-200",
                      hasActiveChild
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:bg-[hsl(var(--brand-blue)/0.08)] hover:text-foreground",
                    )}
                  >
                    <GroupIcon
                      className="h-4 w-4 shrink-0"
                      weight={hasActiveChild ? "duotone" : "regular"}
                    />
                    <span className="truncate">{node.label}</span>
                    {/* Fechado, o grupo carrega a contagem dos filhos — senao
                        o numero da fila sumiria justamente quando o menu
                        esta' recolhido. */}
                    {!open && groupBadge > 0 && (
                      <span className="rounded-full bg-[hsl(var(--brand-amber)/0.18)] px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-[hsl(var(--ink-amber))]">
                        {groupBadge}
                      </span>
                    )}
                    <ChevronRight
                      className={cn(
                        "ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200",
                        open && "rotate-90",
                      )}
                      weight="bold"
                    />
                  </button>

                  {open && (
                    // Trilho a' esquerda no lugar de icones: dois niveis de
                    // icone empilhados competem entre si, a linha so' diz
                    // "isto pertence ao de cima".
                    <div className="mt-1 space-y-0.5 border-l border-[var(--brd)] pb-1 pl-3 ml-[1.35rem]">
                      {children.map((item) => {
                        const active = isActive(item.href);
                        const badge = badges[item.href];
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-2 rounded-[12px] px-3 py-2 text-[13px] transition-all duration-200",
                              active
                                ? "nav-pill-active font-medium"
                                : "text-muted-foreground hover:bg-[hsl(var(--brand-blue)/0.08)] hover:text-foreground",
                            )}
                          >
                            <span className="truncate">{item.label}</span>
                            {badge ? (
                              <span
                                className={cn(
                                  "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums",
                                  active
                                    ? "bg-white/25 text-white"
                                    : "bg-[hsl(var(--brand-amber)/0.18)] text-[hsl(var(--ink-amber))]",
                                )}
                              >
                                {badge}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
      </nav>

      {/* Rodape — o download do app de desktop nao e' um destino do menu:
          usa-se uma vez e nunca mais. */}
      {footer && (
        <div className="border-t border-[var(--brd)] p-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={footer.href}
                  className="flex h-10 items-center justify-center rounded-[14px] text-muted-foreground transition-colors hover:bg-[hsl(var(--brand-blue)/0.08)] hover:text-foreground"
                >
                  <MonitorDown className="h-4 w-4" weight="regular" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Baixar app</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href={footer.href}
              className="glass-chip flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-transform hover:-translate-y-px"
            >
              <MonitorDown
                className="h-4 w-4 shrink-0 text-muted-foreground"
                weight="regular"
              />
              Baixar app
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}

interface NavLinkProps {
  item: NavItem;
  active: boolean;
  badge?: number;
  collapsed?: boolean;
}

// forwardRef porque o TooltipTrigger usa asChild: sem a ref repassada, o
// Radix nao consegue medir o gatilho e o tooltip abre no canto da tela.
const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { item, active, badge, collapsed, ...rest },
  ref,
) {
  const Icon = item.icon;
  return (
    <Link
      ref={ref}
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm transition-all duration-200",
        collapsed && "justify-center px-0",
        active
          ? // Pilula azul->ambar (.nav-pill-active em globals.css). Texto
            // branco de proposito: no ponto do gradiente onde o rotulo cai,
            // o fundo ainda e' azul escuro.
            "nav-pill-active font-medium"
          : "text-muted-foreground hover:bg-[hsl(var(--brand-blue)/0.08)] hover:text-foreground",
      )}
      {...rest}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          !active && "text-muted-foreground/70 group-hover:text-foreground/80",
        )}
        weight={active ? "duotone" : "regular"}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && badge ? (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums",
            active
              ? "bg-white/25 text-white"
              : // Ambar tingido com a tinta escurecida no texto: o ambar puro
                // nao passa em 4.5:1 sobre vidro claro.
                "bg-[hsl(var(--brand-amber)/0.18)] text-[hsl(var(--ink-amber))]",
          )}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
});
