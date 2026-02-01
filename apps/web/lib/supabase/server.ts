import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return null;
  }
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // ignore in Server Components
        }
      },
    },
  });
}

/** Custom magic-link table session (preferred). Returns { user: { id, email } } or null. */
async function getCustomSession(): Promise<{ user: { id: string; email: string } } | null> {
  try {
    const { getSessionCookie } = await import("@/lib/auth/session");
    const user = await getSessionCookie();
    if (!user) return null;
    return { user: { id: user.id, email: user.email } };
  } catch {
    return null;
  }
}

/**
 * Session from custom auth (magic-link) or Supabase Auth.
 * Uses getUser() (not getSession()) so the server validates the session with
 * Supabase Auth and avoids the "could be insecure" warning. When using Supabase
 * Auth we resolve to app_users by email so only users in app_users are treated as logged in.
 */
export async function getSession(): Promise<{ user: { id: string; email?: string } } | null> {
  const custom = await getCustomSession();
  if (custom) return custom;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  let { data: appUser } = await (admin as any)
    .from("app_users")
    .select("id, email")
    .eq("email", user.email)
    .limit(1)
    .single();
  if (!appUser) {
    const { data: inserted, error: insertErr } = await (admin as any)
      .from("app_users")
      .insert({ email: user.email })
      .select("id, email")
      .single();
    if (inserted) appUser = inserted;
    else if (insertErr) {
      const { data: existing } = await (admin as any)
        .from("app_users")
        .select("id, email")
        .eq("email", user.email)
        .limit(1)
        .single();
      if (existing) appUser = existing;
    }
  }
  if (!appUser) return null;
  return { user: { id: appUser.id, email: appUser.email } };
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

export async function getUserEmail(): Promise<string | null> {
  const session = await getSession();
  const email = session?.user?.email;
  return typeof email === "string" && email.trim() ? email.trim() : null;
}

