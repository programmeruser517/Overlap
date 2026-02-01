import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/deps";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    let displayName: string | null = null;
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: row } = await (supabase as any)
        .from("user_onboarding")
        .select("onboarding_data")
        .eq("user_id", userId)
        .limit(1)
        .single();
      const ob = (row?.onboarding_data as Record<string, unknown> | null) ?? {};
      displayName =
        (ob.name as string)?.trim() ||
        (ob.display_name as string)?.trim() ||
        null;
    }
    return NextResponse.json({
      user: {
        id: userId,
        displayName: displayName ?? "Stub User",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
