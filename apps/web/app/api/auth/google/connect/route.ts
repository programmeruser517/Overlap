import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/supabase/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    const origin = request.nextUrl.origin;
    return NextResponse.redirect(`${origin}/login`);
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;
  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/onboarding/connect";
  const state = encodeURIComponent(returnTo);

  if (!clientId) {
    console.error("GOOGLE_CLIENT_ID not set");
    return NextResponse.redirect(`${origin}/onboarding/connect?error=config`);
  }

  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
    access_type: "offline",
    prompt: "consent",
  });

  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  return NextResponse.redirect(url);
}
