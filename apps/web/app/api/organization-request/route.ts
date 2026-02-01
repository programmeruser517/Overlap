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
    .from("organization_requests")
    .select("organization_name, status, created_at")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ organization_name: null, status: null });
  }

  return NextResponse.json({
    organization_name: data.organization_name,
    status: data.status,
    created_at: data.created_at,
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

  let body: { organization_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const organization_name = typeof body.organization_name === "string" ? body.organization_name.trim() : "";
  if (!organization_name) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { error: upsertError } = await supabase.from("organization_requests").upsert(
    {
      user_id: userId,
      organization_name,
      status: "pending",
      updated_at: now,
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "pending" });
}
