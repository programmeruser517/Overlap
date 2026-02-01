import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require session when custom auth (magic-link table) or Supabase Auth is configured.
  const authConfigured =
    !!process.env.SESSION_SECRET ||
    !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (authConfigured) {
    const session = await getSession();
    if (!session) redirect("/login");
  }
  return <div className="appViewer">{children}</div>;
}
