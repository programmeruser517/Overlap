import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("user_onboarding")
    .select("onboarding_data, get_to_main")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    get_to_main: data?.get_to_main ?? false,
    onboarding_data: data?.onboarding_data ?? null,
  });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  let body: { onboarding_data?: Record<string, unknown>; complete?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const onboarding_data = body.onboarding_data ?? {};
  const complete = body.complete === true;
  const now = new Date().toISOString();

  let get_to_main = complete;
  if (!complete) {
    const { data: existing } = await supabase
      .from("user_onboarding")
      .select("get_to_main")
      .eq("user_id", userId)
      .limit(1)
      .single();
    get_to_main = existing?.get_to_main ?? false;
  }

  const { error: upsertError } = await supabase.from("user_onboarding").upsert(
    {
      user_id: userId,
      onboarding_data,
      get_to_main,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, get_to_main: complete });
}
