"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { LogOut, PanelLeft, PanelLeftClose } from "lucide-react";
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
import { ThemeToggle } from "./theme-toggle";
import { signOutAction } from "@/server/actions/auth";
import { initials } from "@/lib/utils";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/types/database";

interface HeaderProps {
  name: string;
  email: string;
  role: UserRole;
  collapsed: boolean;
  onToggleSidebar: () => void;
}

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/albums": "Álbuns",
  "/fila": "Fila de Trabalho",
  "/financial": "Financeiro",
  "/metas": "Metas",
  "/arquivos": "Arquivos",
  "/users": "Usuários",
};

export function Header({ name, email, role, collapsed, onToggleSidebar }: HeaderProps) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const pageLabel = Object.entries(PAGE_LABELS).find(([path]) =>
    pathname.startsWith(path),
  )?.[1];

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 md:px-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        height: "calc(3.5rem + env(safe-area-inset-top))",
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex h-9 w-9 -ml-1"
        onClick={onToggleSidebar}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? (
          <PanelLeft className="h-[18px] w-[18px] text-muted-foreground" />
        ) : (
          <PanelLeftClose className="h-[18px] w-[18px] text-muted-foreground" />
        )}
      </Button>

      {pageLabel && (
        <span className="text-sm font-medium text-foreground/70 tracking-tight">
          {pageLabel}
        </span>
      )}

      <div className="flex-1" />

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2 rounded-xl">
            <Avatar className="h-7 w-7">
              <AvatarFallback
                className="text-[11px] font-semibold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--brand-blue)) 0%, hsl(var(--brand-amber)) 100%)",
                }}
              >
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:inline">{name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {USER_ROLE_LABELS[role]}
              </p>
            </div>
          </DropdownMenuLabel>
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
