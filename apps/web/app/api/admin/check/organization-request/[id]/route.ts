import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await params in Next.js 13+
  const { id } = await params;

  // Validate params
  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

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

  const body = await request.json().catch(() => ({}));
  const status = body?.status;

  if (status !== "accepted" && status !== "rejected") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await (supabase as any)
    .from("organization_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, user_id, organization_name, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data });
}
