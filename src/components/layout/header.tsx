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

export function Header({ name, email, role }: HeaderProps) {
  const [isPending, startTransition] = useTransition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const baseNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/albums", label: "Álbuns", icon: FileImage },
    { href: "/fila", label: "Fila", icon: ListTodo },
  ];
  const adminNav = [
    { href: "/financial", label: "Financeiro", icon: Wallet },
    { href: "/users", label: "Usuários", icon: UsersIcon },
  ];
  const nav = role === "admin" ? [...baseNav, ...adminNav] : baseNav;

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/50 bg-background/80 backdrop-blur-md px-4 md:px-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        height: "calc(3.5rem + env(safe-area-inset-top))",
      }}
    >
      {/* Mobile menu */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden h-10 w-10">
            <Menu className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 h-dvh w-72 rounded-none sm:rounded-none p-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          {/* Cabeçalho do menu mobile */}
          <div
            className="flex h-14 items-center gap-2.5 px-5 border-b border-border/50 shrink-0"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              height: "calc(3.5rem + env(safe-area-inset-top))",
            }}
          >
            <Image
              src="/logo-stepalbum.svg"
              alt="StepAlbum"
              width={40}
              height={40}
              className="rounded-lg shrink-0"
            />
            <span className="text-2xl font-semibold tracking-tight">
              StepAlbum
            </span>
          </div>

          {/* Links centralizados verticalmente */}
          <nav className="flex-1 flex flex-col justify-center px-4 py-6 space-y-3.5">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
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
        </DialogContent>
      </Dialog>

      <div className="flex-1" />

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback
                className="text-[11px] font-semibold text-white"
                style={{
                  background:
                    "linear-gradient(125deg, hsl(var(--brand-blue)) 0%, hsl(var(--brand-amber)) 100%)",
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
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
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
