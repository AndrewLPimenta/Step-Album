"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Wallet,
  Users as UsersIcon,
  FileImage,
  ListTodo,
  LogOut,
  Menu,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeToggle } from "./theme-toggle";
import { signOutAction } from "@/server/actions/auth";
import { cn, initials } from "@/lib/utils";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/types/database";

interface HeaderProps {
  name: string;
  email: string;
  role: UserRole;
}

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/albums": "Álbuns",
  "/fila": "Fila de Trabalho",
  "/financial": "Financeiro",
  "/users": "Usuários",
};

export function Header({ name, email, role }: HeaderProps) {
  const [isPending, startTransition] = useTransition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const baseNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/albums", label: "Álbuns", icon: FileImage },
    { href: "/fila", label: "Fila", icon: ListTodo },
    { href: "/financial", label: "Financeiro", icon: Wallet },
  ];
  const adminNav = [{ href: "/users", label: "Usuários", icon: UsersIcon }];
  const nav = role === "admin" ? [...baseNav, ...adminNav] : baseNav;

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
      {/* Mobile menu trigger */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 h-dvh w-72 rounded-none sm:rounded-none p-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <div
            className="flex h-14 items-center gap-2.5 px-5 border-b border-border/40 shrink-0"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              height: "calc(3.5rem + env(safe-area-inset-top))",
            }}
          >
            <Image
              src="/logo-stepalbum.svg"
              alt="StepAlbum"
              width={36}
              height={36}
              className="rounded-xl shrink-0"
            />
            <span className="text-[15px] font-semibold tracking-tight">StepAlbum</span>
          </div>
          <nav className="flex-1 flex flex-col justify-center px-4 py-6 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                    active
                      ? "bg-[hsl(var(--brand-blue)/0.1)] text-[hsl(var(--brand-blue))] font-medium"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      active ? "text-[hsl(var(--brand-amber))]" : "text-muted-foreground/50",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </DialogContent>
      </Dialog>

      {/* Page title — desktop */}
      {pageLabel && (
        <span className="hidden md:block text-sm font-medium text-foreground/70 tracking-tight">
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
