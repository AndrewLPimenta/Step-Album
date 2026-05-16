"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  createUserAction,
  deactivateUserAction,
  reactivateUserAction,
} from "@/server/actions/users";
import { initials } from "@/lib/utils";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { UserRow } from "@/types/database";
import { UserPlus, Loader2, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface UsersListProps {
  users: UserRow[];
}

export function UsersList({ users }: UsersListProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "diagramador">("diagramador");

  function handleCreate() {
    startTransition(async () => {
      const r = await createUserAction({ name, email, password, role });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Usuário criado");
      setName("");
      setEmail("");
      setPassword("");
      setRole("diagramador");
      setOpen(false);
    });
  }

  function toggleActive(user: UserRow) {
    startTransition(async () => {
      const r = user.active
        ? await deactivateUserAction(user.id)
        : await reactivateUserAction(user.id);
      if (!r.ok) toast.error(r.error);
      else toast.success(user.active ? "Usuário desativado" : "Usuário reativado");
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            Gerencie quem tem acesso ao painel
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4" />
              Novo usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
              <DialogDescription>
                A senha definida aqui será usada pelo usuário no primeiro
                acesso.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="u_name">Nome</Label>
                <Input
                  id="u_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u_email">E-mail</Label>
                <Input
                  id="u_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u_password">Senha</Label>
                <Input
                  id="u_password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  minLength={8}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Função</Label>
                <Select
                  value={role}
                  onValueChange={(v) =>
                    setRole(v as "admin" | "diagramador")
                  }
                  disabled={isPending}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diagramador">Diagramador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-card/30 px-3 py-2.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, hsl(var(--brand-blue)) 0%, hsl(var(--brand-amber)) 100%)",
                  }}
                >
                  {initials(u.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                  {u.name}
                  <Badge
                    variant={u.role === "admin" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {USER_ROLE_LABELS[u.role]}
                  </Badge>
                  {!u.active && (
                    <Badge variant="destructive" className="text-[10px]">
                      Inativo
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {u.email}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant={u.active ? "ghost" : "outline"}
              disabled={isPending}
              onClick={() => toggleActive(u)}
              className="text-xs"
            >
              {u.active ? (
                <>
                  <Ban className="h-3.5 w-3.5" />
                  Desativar
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reativar
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
