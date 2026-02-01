import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

/**
 * Returns members in the current user's organization (same org name, status accepted).
 * Used for @ mention search within network only.
 */
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { data: myOrg, error: myError } = await (supabase as any)
    .from("organization_requests")
    .select("organization_name")
    .eq("user_id", userId)
    .eq("status", "accepted")
    .limit(1)
    .single();

  if (myError || !myOrg?.organization_name) {
    return NextResponse.json({ members: [] }, { status: 200 });
  }

  const orgName = myOrg.organization_name as string;

  const { data: orgUserIds, error: orgError } = await (supabase as any)
    .from("organization_requests")
    .select("user_id")
    .eq("organization_name", orgName)
    .eq("status", "accepted");

  if (orgError || !orgUserIds?.length) {
    return NextResponse.json({ members: [] }, { status: 200 });
  }

  const userIds = orgUserIds.map((r: { user_id: string }) => r.user_id).filter(Boolean);

  const { data: users, error: usersError } = await (supabase as any)
    .from("app_users")
    .select("id, email")
    .in("id", userIds);

  if (usersError) {
    return NextResponse.json({ members: [] }, { status: 200 });
  }

  const members = (users ?? []).map((u: { id: string; email: string | null }) => ({
    id: u.id,
    email: u.email ?? "",
    name: (u.email ?? "")?.split("@")[0] ?? u.id.slice(0, 8),
  }));

  return NextResponse.json({ members });
}
