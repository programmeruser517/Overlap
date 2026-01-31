import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // When Supabase is configured, require a session; otherwise allow (stub auth).
  const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (hasSupabase) {
    const session = await getSession();
    if (!session) redirect("/login");
  }
  return <>{children}</>;
}
