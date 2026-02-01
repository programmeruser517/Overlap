import { NextResponse } from "next/server";
import { threadApi, getCurrentUserId } from "@/lib/deps";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Enrich thread participants with displayName (user_onboarding.onboarding_data.name) and email (app_users). */
async function enrichParticipants(thread: { participants: Array<{ userId: string; email?: string; displayName?: string }> }) {
  const participants = thread.participants ?? [];
  if (participants.length === 0) return thread;

  const supabase = getSupabaseAdmin();
  if (!supabase) return thread;

  const userIds = [...new Set(participants.map((p) => p.userId).filter(Boolean))];
  if (userIds.length === 0) return thread;

  const { data: onboardingRows } = await (supabase as any)
    .from("user_onboarding")
    .select("user_id, onboarding_data")
    .in("user_id", userIds);

  const { data: appUsers } = await (supabase as any)
    .from("app_users")
    .select("id, email")
    .in("id", userIds);

  const nameByUser = new Map<string, string>();
  for (const row of onboardingRows ?? []) {
    const r = row as { user_id: string; onboarding_data?: Record<string, unknown> };
    const ob = (r.onboarding_data ?? {}) as Record<string, unknown>;
    const name =
      (typeof ob.name === "string" ? ob.name : null) ||
      (typeof ob.display_name === "string" ? ob.display_name : null) ||
      "";
    if (name) nameByUser.set(r.user_id, name.trim());
  }

  const emailByUser = new Map<string, string>();
  for (const u of appUsers ?? []) {
    const x = u as { id: string; email: string | null };
    if (x.id && x.email) emailByUser.set(x.id, x.email);
  }

  const enriched = participants.map((p) => {
    const displayName =
      p.displayName ||
      nameByUser.get(p.userId) ||
      (p.email ? p.email.split("@")[0] : null) ||
      emailByUser.get(p.userId)?.split("@")[0] ||
      null;
    const email = p.email || emailByUser.get(p.userId) || "";
    return {
      ...p,
      email: email || undefined,
      displayName: displayName || undefined,
    };
  });

  return { ...thread, participants: enriched };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    const thread = await threadApi.get(id);
    if (!thread) return NextResponse.json({ thread: null }, { status: 404 });
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ownerId = String(thread.ownerId ?? "").toLowerCase();
    const uid = String(userId).toLowerCase();
    if (ownerId !== uid) return NextResponse.json({ thread: null }, { status: 404 });
    const enriched = await enrichParticipants(thread);
    return NextResponse.json({ thread: enriched });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
