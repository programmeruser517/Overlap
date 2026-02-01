import { NextResponse } from "next/server";
import { getUserId } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ google: false, microsoft: false }, { status: 200 });
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ google: false, microsoft: false }, { status: 200 });
    }
    const { data: rows } = await (supabase as any)
      .from("linked_accounts")
      .select("provider")
      .eq("user_id", userId);
    const providers = new Set((rows ?? []).map((r: { provider: string }) => r.provider));
    return NextResponse.json({
      google: providers.has("google"),
      microsoft: providers.has("microsoft"),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
