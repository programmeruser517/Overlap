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
  if (userIds.length === 0) {
    return NextResponse.json({ members: [], organization_name: orgName }, { status: 200 });
  }

  const { data: users, error: usersError } = await (supabase as any)
    .from("app_users")
    .select("id, email")
    .in("id", userIds);

  if (usersError) {
    return NextResponse.json({ members: [], organization_name: orgName }, { status: 200 });
  }

  const { data: onboardingRows, error: onboardingError } = await (supabase as any)
    .from("user_onboarding")
    .select("user_id, onboarding_data")
    .in("user_id", userIds);

  if (onboardingError) {
    return NextResponse.json({ members: [], organization_name: orgName }, { status: 200 });
  }

  const onboardingByUser = new Map<string, Record<string, unknown>>();
  for (const row of onboardingRows ?? []) {
    const r = row as { user_id: string; onboarding_data?: Record<string, unknown> };
    onboardingByUser.set(r.user_id, (r.onboarding_data as Record<string, unknown>) ?? {});
  }

  const members = (users ?? []).map((u: { id: string; email: string | null }) => {
    const ob = onboardingByUser.get(u.id) ?? {};
    const nameFromOb = typeof (ob as { name?: string }).name === "string" ? (ob as { name?: string }).name : "";
    return {
      id: u.id,
      email: u.email ?? "",
      name: nameFromOb || (u.email ?? "")?.split("@")[0] || u.id.slice(0, 8),
      onboarding_data: ob,
      organization_name: orgName,
    };
  });

  return NextResponse.json({ members, organization_name: orgName });
}
