/**
 * Seed initial users: Andrew (admin), Duda (admin), Laura (diagramador).
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 * Idempotent: re-running won't fail; it updates the profile if the auth user exists.
 *
 * Usage:
 *   npm run seed:users
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: "admin" | "diagramador";
}

const USERS: SeedUser[] = [
  {
    name: "Andrew",
    email: "andrewpimenta.dev@gmail.com",
    password: "Andrew3122@",
    role: "admin",
  },
  {
    name: "Duda",
    email: "maria.edu.franca@gmail.com",
    password: "Joao5492@",
    role: "admin",
  },
  {
    name: "Laura",
    email: "lauraromaneli2@gmail.com",
    password: "Allbb326",
    role: "diagramador",
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local",
    );
    process.exit(1);
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("🌱 Criando usuários iniciais...\n");

  for (const u of USERS) {
    process.stdout.write(`→ ${u.name} <${u.email}> ... `);

    // 1) Try to find existing auth user
    const { data: existing } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const found = existing.users.find((x) => x.email === u.email);

    let authId: string;
    if (found) {
      authId = found.id;
      // Update password to ensure consistency with what's documented
      await admin.auth.admin.updateUserById(authId, {
        password: u.password,
        email_confirm: true,
      });
      process.stdout.write("(atualizado) ");
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name },
      });
      if (error || !data.user) {
        console.error("\n❌ Falhou:", error?.message);
        continue;
      }
      authId = data.user.id;
      process.stdout.write("(criado) ");
    }

    // 2) Upsert profile in public.users
    const { error: profileErr } = await admin
      .from("users")
      .upsert(
        {
          id: authId,
          email: u.email,
          name: u.name,
          role: u.role,
          active: true,
        },
        { onConflict: "id" },
      );

    if (profileErr) {
      console.error("\n❌ Falha no perfil:", profileErr.message);
      continue;
    }

    console.log("✅");
  }

  console.log("\n✨ Pronto! Os 3 usuários foram garantidos no banco.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
