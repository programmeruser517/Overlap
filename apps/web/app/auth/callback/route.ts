import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { setSessionCookie } from "@/lib/auth/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const next = searchParams.get("next") ?? "/onboarding";
  const origin = request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  const now = new Date().toISOString();

  const { data: row, error: fetchError } = await supabase
    .from("magic_link_tokens")
    .select("id, email")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", now)
    .limit(1)
    .single();

  if (fetchError || !row) {
    return NextResponse.redirect(`${origin}/login?error=invalid_or_expired`);
  }

  const { error: updateError } = await supabase
    .from("magic_link_tokens")
    .update({ used_at: now })
    .eq("id", row.id);

  if (updateError) {
    return NextResponse.redirect(`${origin}/login?error=invalid_or_expired`);
  }

  const email = row.email as string;

  const { data: userRow, error: userError } = await supabase
    .from("app_users")
    .select("id")
    .eq("email", email)
    .limit(1)
    .single();

  let userId: string;
  if (userRow) {
    userId = userRow.id;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("app_users")
      .insert({ email })
      .select("id")
      .single();
    if (insertError || !inserted) {
      return NextResponse.redirect(`${origin}/login?error=signup_failed`);
    }
    userId = inserted.id;
  }

  await setSessionCookie({ id: userId, email });
  return NextResponse.redirect(`${origin}${next}`);
}
