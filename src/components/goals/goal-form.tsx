"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { upsertGoalAction, deleteGoalAction } from "@/server/actions/goals";
import { ALL_GOAL_TYPES, GOAL_TYPE_LABELS, type GoalType } from "@/lib/constants";
import type { UserGoalRow } from "@/types/database";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

interface GoalFormProps {
  goal: UserGoalRow | null;
}

export function GoalForm({ goal }: GoalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [goalType, setGoalType] = useState<GoalType>(goal?.goal_type ?? "valor");
  const [goalValue, setGoalValue] = useState(
    goal?.goal_value ? String(goal.goal_value) : "",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedValue = Number(goalValue.replace(",", "."));
    if (!parsedValue || parsedValue <= 0) {
      toast.error("Informe um valor de meta válido.");
      return;
    }
    startTransition(async () => {
      const result = await upsertGoalAction({
        goal_type: goalType,
        goal_value: parsedValue,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(goal ? "Meta atualizada" : "Meta criada");
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGoalAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Meta removida");
      setGoalValue("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{goal ? "Editar meta" : "Definir meta"}</CardTitle>
        <CardDescription>
          Escolha se quer acompanhar por valor a receber ou por quantidade de
          álbuns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de meta</Label>
              <Select
                value={goalType}
                onValueChange={(v) => setGoalType(v as GoalType)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_GOAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {GOAL_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goal_value">
                {goalType === "albuns" ? "Quantidade de álbuns" : "Valor (R$)"}
              </Label>
              <Input
                id="goal_value"
                inputMode="decimal"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
                disabled={isPending}
                placeholder={goalType === "albuns" ? "Ex: 100" : "Ex: 1500"}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {goal && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
                Remover meta
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {goal ? "Salvar" : "Criar meta"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
