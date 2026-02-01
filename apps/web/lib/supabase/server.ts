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
 * When using Supabase Auth, we resolve to app_users by email so the app only
 * treats users in app_users as logged in (e.g. test@overlap.com in auth.users
 * but not in app_users will get no session).
 */
export async function getSession(): Promise<{ user: { id: string; email?: string } } | null> {
  const custom = await getCustomSession();
  if (custom) return custom;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) return null;
  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data: appUser } = await (admin as any)
    .from("app_users")
    .select("id, email")
    .eq("email", session.user.email)
    .limit(1)
    .single();
  if (!appUser) return null;
  return { user: { id: appUser.id, email: appUser.email } };
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}
