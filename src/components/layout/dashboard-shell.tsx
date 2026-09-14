"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export interface CycleSummary {
  /** "03 — 18 set" */
  label: string;
  albums: number;
  people: number;
  /** Baixado + editando + montado — o badge da /fila. */
  pending: number;
}

interface DashboardShellProps {
  name: string;
  email: string;
  role: UserRole;
  cycle: CycleSummary;
  children: React.ReactNode;
}

export function DashboardShell({
  name,
  email,
  role,
  cycle,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative min-h-dvh flex">
        {/* Camada de aurora — o fundo colorido que o vidro das superficies
            borra. Posicao, altura (100lvh) e z-index vivem na classe .aurora
            em globals.css, nao em utilitarios: no mobile o inset-0 para no
            viewport pequeno e sobra uma faixa sem cor sob a barra do
            navegador. Ela fica em z-0 e todo o conteudo sobe pra z-10. */}
        <div className="aurora pointer-events-none" aria-hidden="true" />
        <Sidebar role={role} collapsed={collapsed} cycle={cycle} />
        <div
          className={cn(
            "relative z-10 flex-1 flex flex-col min-w-0 transition-[padding-left] duration-300",
            // 0.75rem de folga da sidebar + a largura dela + 0.5rem de
            // respiro ate' o conteudo.
            collapsed ? "md:pl-[5.75rem]" : "md:pl-[17.25rem]",
          )}
        >
          <Header
            name={name}
            email={email}
            role={role}
            collapsed={collapsed}
            cycleLabel={cycle.label}
            onToggleSidebar={() => setCollapsed((c) => !c)}
          />
          <main className="flex-1 flex flex-col items-center px-3 pt-3 pb-20 md:px-4 md:pt-4 md:pb-4 animate-fade-in">
            <div className="mx-auto w-full max-w-[1800px]">{children}</div>
          </main>
        </div>
        <BottomNav role={role} />
      </div>
    </TooltipProvider>
  );
}
