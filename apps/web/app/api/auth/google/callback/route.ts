import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;
  const returnTo = state ? decodeURIComponent(state) : "/onboarding/connect";

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(returnTo)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}${returnTo}?error=missing_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
    return NextResponse.redirect(`${origin}${returnTo}?error=config`);
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Google token exchange failed:", tokenRes.status, err);
    return NextResponse.redirect(`${origin}${returnTo}?error=token_exchange`);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.redirect(`${origin}${returnTo}?error=config`);
  }

  const { error } = await supabase.from("linked_accounts").upsert(
    {
      user_id: userId,
      provider: "google",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (error) {
    console.error("linked_accounts upsert failed:", error);
    return NextResponse.redirect(`${origin}${returnTo}?error=save_failed`);
  }

  return NextResponse.redirect(`${origin}${returnTo}`);
}
