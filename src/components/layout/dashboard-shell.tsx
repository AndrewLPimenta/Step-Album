"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

interface DashboardShellProps {
  name: string;
  email: string;
  role: UserRole;
  children: React.ReactNode;
}

export function DashboardShell({ name, email, role, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh flex">
        <Sidebar role={role} collapsed={collapsed} />
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 transition-[padding-left] duration-300",
            collapsed ? "md:pl-[4.5rem]" : "md:pl-64",
          )}
        >
          <Header
            name={name}
            email={email}
            role={role}
            collapsed={collapsed}
            onToggleSidebar={() => setCollapsed((c) => !c)}
          />
          <main className="flex-1 flex flex-col items-center p-4 md:p-6 pb-20 md:pb-6 animate-fade-in">
            <div className="w-full max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
        <BottomNav role={role} />
      </div>
    </TooltipProvider>
  );
}
