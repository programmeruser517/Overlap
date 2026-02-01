import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  // Check demo admin cookie
  const cookieStore = await cookies();
  const isDemoAdmin = cookieStore.get("demo_admin")?.value === "1";

  if (!isDemoAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { data, error } = await (supabase as any)
    .from("organization_requests")
    .select("id, user_id, organization_name, status, created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = (data ?? []) as Array<{ id: string; user_id: string; organization_name: string; status: string; created_at: string }>;
  list.sort((a, b) => {
    const aPending = a.status === "pending";
    const bPending = b.status === "pending";
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return NextResponse.json({ requests: list });
}
