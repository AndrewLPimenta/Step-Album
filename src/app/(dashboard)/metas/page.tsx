import { requireUser } from "@/lib/auth";
import { getMyGoal, getMyGoalProgress } from "@/lib/queries";
import { GoalForm } from "@/components/goals/goal-form";
import { formatBRL } from "@/lib/financial";
import { GOAL_TYPE_LABELS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Target } from "lucide-react";

export default async function MetasPage() {
  const { profile } = await requireUser();
  const goal = await getMyGoal(profile.id);
  const progress = await getMyGoalProgress(profile);

  const current = goal?.goal_type === "albuns" ? progress.albumCount : progress.earnings;
  const target = goal?.goal_value ?? 0;
  const pct = goal && target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha meta</h1>
        <p className="text-sm text-muted-foreground">
          Defina uma meta pessoal e acompanhe seu progresso.
        </p>
      </div>

      {goal && (
        <Card className="border-2 border-[hsl(var(--brand-blue)/0.4)] bg-[hsl(var(--brand-blue)/0.05)]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[hsl(var(--brand-blue))]" />
              <CardTitle className="text-base">Progresso</CardTitle>
            </div>
            <CardDescription>{GOAL_TYPE_LABELS[goal.goal_type]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold tabular-nums">
                {goal.goal_type === "albuns" ? current : formatBRL(current)}
              </p>
              <p className="text-sm text-muted-foreground">
                de {goal.goal_type === "albuns" ? target : formatBRL(target)}
              </p>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background:
                    "linear-gradient(90deg, hsl(var(--brand-blue)) 0%, hsl(var(--brand-amber)) 100%)",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {pct >= 100 ? "Meta atingida! 🎉" : `${pct.toFixed(0)}% concluído`}
            </p>
          </CardContent>
        </Card>
      )}

      <GoalForm goal={goal} />
    </div>
  );
}
