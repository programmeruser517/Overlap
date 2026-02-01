/**
 * Server-side org members for orchestration (resolve @mentions to user ids).
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type OrgMember = { id: string; email: string; name: string };

export async function getOrgMembers(userId: string): Promise<OrgMember[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: myOrg, error: myError } = await (supabase as any)
    .from("organization_requests")
    .select("organization_name")
    .eq("user_id", userId)
    .eq("status", "accepted")
    .limit(1)
    .single();

  if (myError || !myOrg?.organization_name) return [];

  const orgName = myOrg.organization_name as string;

  const { data: orgRows, error: orgError } = await (supabase as any)
    .from("organization_requests")
    .select("user_id")
    .eq("organization_name", orgName)
    .eq("status", "accepted");

  if (orgError || !orgRows?.length) return [];

  const userIds = orgRows.map((r: { user_id: string }) => r.user_id).filter(Boolean);
  if (userIds.length === 0) return [];

  const { data: onboardingRows, error: onboardingError } = await (supabase as any)
    .from("user_onboarding")
    .select("user_id, onboarding_data")
    .in("user_id", userIds);

  if (onboardingError) return [];

  const onboardingByUser = new Map<string, Record<string, unknown>>();
  for (const row of onboardingRows ?? []) {
    const r = row as { user_id: string; onboarding_data?: Record<string, unknown> };
    onboardingByUser.set(r.user_id, (r.onboarding_data as Record<string, unknown>) ?? {});
  }

  const { data: appUsers } = await (supabase as any)
    .from("app_users")
    .select("id, email")
    .in("id", userIds);
  const emailByUser = new Map<string, string>();
  for (const u of appUsers ?? []) {
    const x = u as { id: string; email: string | null };
    if (x.id && x.email) emailByUser.set(x.id, x.email);
  }

  return userIds.map((uid: string) => {
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
    };
  });
}

/**
 * Resolve @mention labels (from prompt or tokens) to user ids using org members.
 * Excludes the owner. Returns unique ids in order of first mention.
 */
export function resolveMentionsToUserIds(
  mentionLabels: string[],
  members: OrgMember[],
  ownerId: string
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const normalized = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  for (const label of mentionLabels) {
    const n = normalized(label);
    for (const m of members) {
      if (m.id === ownerId) continue;
      if (seen.has(m.id)) continue;
      const nameMatch = normalized(m.name).includes(n) || n.includes(normalized(m.name));
      const emailMatch = m.email && (m.email.toLowerCase().startsWith(n) || n === m.email.toLowerCase().split("@")[0]);
      if (nameMatch || emailMatch) {
        seen.add(m.id);
        out.push(m.id);
        break;
      }
    }
  }
  return out;
}
