"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Users,
  FileImage,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const baseNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/albums", label: "Álbuns", icon: FileImage },
    { href: "/fila", label: "Fila", icon: ListTodo },
  ];
  const adminNav = [
    { href: "/users", label: "Usuários", icon: Users },
  ];
  const nav = [
    ...baseNav,
    { href: "/financial", label: "Financeiro", icon: Wallet },
    ...(role === "admin" ? adminNav : []),
  ];

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-border/50 backdrop-blur-md animate-in slide-in-from-left-5 fade-in duration-500">
      <div className="flex h-14 items-center gap-2.5 px-7 ">
        <Image
          src="/logo-stepalbum.svg"
          alt="StepAlbum"
          width={50}
          height={50}
          className="rounded-lg shrink-0"
        />
        <span className="text-2xl font-semibold tracking-tight">StepAlbum</span>
      </div>

      {/* Separador âmbar */}
      <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--brand-amber)/0.5)] to-transparent" />
      <div className="h-px bg-gradient-to-r from-transparent via-[hsl(blue))] to-transparent p-2" />

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[hsl(var(--brand-blue)/0.1)] text-[hsl(var(--brand-blue))] font-medium dark:bg-accent dark:text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active &&
                    "text-[hsl(var(--brand-amber))] dark:text-accent-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
