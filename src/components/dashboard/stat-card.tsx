import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className={cn("group transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div
          className="text-2xl font-semibold tabular-nums tracking-tight bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(125deg, hsl(var(--brand-blue)) 0%, hsl(var(--brand-blue)/0.7) 100%)",
          }}
        >
          {value}
        </div>
        {(description || trend) && (
          <CardDescription className="mt-1 text-xs flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center font-medium",
                  trend.positive ? "text-success" : "text-destructive",
                )}
              >
                {trend.value}
              </span>
            )}
            {description && (
              <span style={{ color: "hsl(var(--brand-amber))" }}>
                {description}
              </span>
            )}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
