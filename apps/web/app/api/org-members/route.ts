import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

/**
 * Returns members in the current user's organization.
 * Source of truth: organization_requests (same org name, status accepted).
 * Names come from user_onboarding (single row per user_id); email from app_users when present.
 * Supports both app_users and auth-only users (as long as they have org_requests + onboarding).
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

  // 1) My org from organization_requests (accepted)
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

  // 2) All user_ids in same org, accepted (source of truth for membership)
  const { data: orgRows, error: orgError } = await (supabase as any)
    .from("organization_requests")
    .select("user_id")
    .eq("organization_name", orgName)
    .eq("status", "accepted");

  if (orgError || !orgRows?.length) {
    return NextResponse.json({ members: [] }, { status: 200 });
  }

  const userIds = orgRows.map((r: { user_id: string }) => r.user_id).filter(Boolean);
  if (userIds.length === 0) {
    return NextResponse.json({ members: [], organization_name: orgName }, { status: 200 });
  }

  // 3) Names from user_onboarding (one row per user_id)
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

  // 4) Optional: email from app_users (when row exists)
  const { data: appUsers } = await (supabase as any)
    .from("app_users")
    .select("id, email")
    .in("id", userIds);
  const emailByUser = new Map<string, string>();
  for (const u of appUsers ?? []) {
    const x = u as { id: string; email: string | null };
    if (x.id && x.email) emailByUser.set(x.id, x.email);
  }

  // 5) One member per user_id from org_requests; name from onboarding, email from app_users or ""
  const members = userIds.map((uid: string) => {
    const ob = onboardingByUser.get(uid) ?? {};
    const nameFromOb =
      (typeof (ob as { name?: string }).name === "string" ? (ob as { name?: string }).name : null) ||
      (typeof (ob as { display_name?: string }).display_name === "string" ? (ob as { display_name?: string }).display_name : null) ||
      "";
    const email = emailByUser.get(uid) ?? "";
    return {
      id: uid,
      email,
      name: nameFromOb || email?.split("@")[0] || uid.slice(0, 8),
      onboarding_data: ob,
      organization_name: orgName,
    };
  });

  return NextResponse.json({ members, organization_name: orgName });
}
