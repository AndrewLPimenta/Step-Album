import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UsersList } from "@/components/users/users-list";

export default async function UsersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("*").order("name");

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Gerenciamento de Pessoas
        </p>
      </div>
      <UsersList users={data ?? []} />
    </div>
  );
}
