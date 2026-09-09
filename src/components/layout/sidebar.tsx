"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  NAV_GROUP_LABELS,
  NAV_GROUP_ORDER,
  navItemsForRole,
} from "@/lib/constants";
import type { UserRole } from "@/types/database";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  role: UserRole;
  collapsed: boolean;
}

export function Sidebar({ role, collapsed }: SidebarProps) {
  const pathname = usePathname();
  const nav = navItemsForRole(role);
  const groups = NAV_GROUP_ORDER.map((g) => ({
    group: g,
    items: nav.filter((item) => item.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        "app-sidebar hidden md:flex md:flex-col md:fixed md:inset-y-0 border-r border-border/40 bg-background/98 backdrop-blur-xl overflow-hidden transition-[width] duration-300 animate-in slide-in-from-left-5 fade-in duration-500",
        collapsed ? "md:w-[4.5rem]" : "md:w-64",
      )}
    >
      {/* Ambient glow top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-[hsl(var(--brand-blue)/0.07)] to-transparent" />
      <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-[hsl(var(--brand-amber)/0.07)] blur-3xl" />

      {/* Logo — also doubles as the window drag handle in the desktop app
          (data-tauri-drag-region is a no-op in a normal browser tab; only
          the Tauri shell honors it, for the traffic-light overlay title bar). */}
      <div
        data-tauri-drag-region
        className={cn(
          "app-sidebar-logo relative flex h-16 shrink-0 items-center gap-3 px-5 transition-all duration-300",
          collapsed && "justify-center px-0",
        )}
      >
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-xl bg-[hsl(var(--brand-amber)/0.3)] blur-md" />
          <Image
            src="/logo-stepalbum.svg"
            alt="StepAlbum"
            width={36}
            height={36}
            className="relative rounded-xl"
          />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight">StepAlbum</span>
            <span className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground/50">
              Painel
            </span>
          </div>
        )}
      </div>

      {/* Amber separator */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[hsl(var(--brand-amber)/0.5)] to-transparent" />

      {/* Nav — agrupada por dominio. Antes era uma lista plana de 10 itens
          com todos os pesos iguais, entao nada distinguia a /fila (uso
          diario) do /app (uso unico). */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map(({ group, items }, gi) => (
          <div key={group} className={cn(gi > 0 && "mt-4")}>
            {collapsed ? (
              gi > 0 && <div className="mx-auto mb-3 h-px w-8 bg-border/70" />
            ) : (
              <div className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/45">
                {NAV_GROUP_LABELS[group]}
              </div>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                const link = (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-[hsl(var(--brand-blue)/0.1)] font-medium text-[hsl(var(--brand-blue))] dark:bg-accent dark:text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    {/* Barra de destaque. Junto com o fundo tintado sao os
                        dois unicos sinais de "ativo" — o icone ambar e a
                        sombra eram um terceiro e um quarto dizendo a mesma
                        coisa. O icone agora herda a cor do link. */}
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[hsl(var(--brand-amber))]" />
                    )}
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors",
                        !active &&
                          "text-muted-foreground/70 group-hover:text-foreground/80",
                      )}
                    />
                    {!collapsed && item.label}
                  </Link>
                );

                if (!collapsed) {
                  return <div key={item.href}>{link}</div>;
                }

                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom ambient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[hsl(var(--brand-blue)/0.04)] to-transparent" />
    </aside>
  );
}
