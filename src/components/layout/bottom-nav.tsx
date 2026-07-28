"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import type { UserRole } from "@/types/database";

interface BottomNavProps {
  role: UserRole;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const nav = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-0.5 transition-colors",
                active ? "text-[hsl(var(--brand-blue))]" : "text-muted-foreground",
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-gradient-to-r from-[hsl(var(--brand-amber))] to-[hsl(var(--brand-blue))]" />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active && "text-[hsl(var(--brand-amber))]",
                )}
              />
              <span className="text-[10px] font-medium leading-tight truncate w-full text-center px-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
