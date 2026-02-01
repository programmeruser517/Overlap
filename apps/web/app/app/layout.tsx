import { redirect } from "next/navigation";
import Link from "next/link";
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
  return (
    <div className="appShell">
      <nav className="appNav">
        <div className="appNavInner">
          <Link href="/app" className="appNavLink">
            Home
          </Link>
          <Link href="/app/settings" className="appNavLink">
            Settings
          </Link>
        </div>
      </nav>
      <div className="appViewer">{children}</div>
    </div>
  );
}
