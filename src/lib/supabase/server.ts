import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component - safe to ignore, middleware refreshes session.
          }
        },
      },
    },
  );
}

/**
 * Admin client using the SERVICE ROLE key. Bypasses RLS.
 * Only use in trusted server-side code (server actions, route handlers, scripts).
 * Never expose this client to the browser.
 */
import { createClient as _adminCreate } from "@supabase/supabase-js";
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or URL");
  }
  return _adminCreate<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
