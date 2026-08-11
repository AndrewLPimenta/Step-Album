"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import type { UserRole } from "@/types/database";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  role: UserRole;
  collapsed: boolean;
}

export function Sidebar({ role, collapsed }: SidebarProps) {
  const pathname = usePathname();
  const nav = NAV_ITEMS.filter((item) => !item.criadorOnly || role === "criador");

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

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          const link = (
            <Link
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                collapsed && "justify-center px-0",
                active
                  ? "bg-[hsl(var(--brand-blue)/0.1)] text-[hsl(var(--brand-blue))] font-medium shadow-sm dark:bg-accent dark:text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {/* Active accent bar */}
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-[hsl(var(--brand-amber))] to-[hsl(var(--brand-blue)/0.6)]" />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  active
                    ? "text-[hsl(var(--brand-amber))]"
                    : "text-muted-foreground/50 group-hover:text-foreground/70",
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
      </nav>

      {/* Bottom ambient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[hsl(var(--brand-blue)/0.04)] to-transparent" />
    </aside>
  );
}
