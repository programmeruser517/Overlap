import { getUserEmail } from "@/lib/supabase/server";

export async function isAdmin(): Promise<boolean> {
  const email = await getUserEmail();
  if (!email) return false;

  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return list.includes(email.toLowerCase());
}
