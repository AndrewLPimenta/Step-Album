import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[hsl(var(--brand-blue)/0.08)] hover:border-[hsl(var(--brand-blue)/0.2)]",
        className,
      )}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[hsl(var(--brand-blue)/0.07)] blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-80" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {title}
          </p>
          <p
            className="mt-2.5 text-3xl font-bold tabular-nums tracking-tight bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, hsl(var(--brand-blue)) 0%, hsl(var(--brand-amber)) 100%)",
            }}
          >
            {value}
          </p>
          {(description || trend) && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {trend && (
                <span
                  className={cn(
                    "font-medium",
                    trend.positive ? "text-success" : "text-destructive",
                  )}
                >
                  {trend.value}
                </span>
              )}
              {description}
            </p>
          )}
        </div>

        {Icon && (
          <div
            className="shrink-0 rounded-xl p-2.5 transition-all duration-300 group-hover:scale-110"
            style={{ background: "hsl(var(--brand-blue)/0.1)" }}
          >
            <Icon
              className="h-5 w-5 transition-colors duration-300"
              style={{ color: "hsl(var(--brand-blue))" }}
            />
          </div>
        )}
      </div>

      {/* Hover bottom accent */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] translate-y-px bg-gradient-to-r from-[hsl(var(--brand-blue)/0.6)] via-[hsl(var(--brand-amber)/0.8)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}
