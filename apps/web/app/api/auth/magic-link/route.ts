import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

const TOKEN_TTL_MINUTES = 15;

const DEV_EMAIL = "programmeruser517@gmail.com";

async function sendMagicLinkEmail(requestedBy: string, magicLink: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.RESEND_FROM || "Overlap <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [DEV_EMAIL],
      subject: "Overlap sign-in link",
      html: `<p><strong>Requested by:</strong> ${requestedBy}</p><p>Click the link below to sign in to Overlap. It expires in ${TOKEN_TTL_MINUTES} minutes.</p><p><a href="${magicLink}">Sign in to Overlap</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    }),
  });
  return res.ok;
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Auth not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

  const { error: insertError } = await (supabase as any).from("magic_link_tokens").insert({
    token,
    email,
    expires_at: expiresAt,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const magicLink = `${origin}/auth/callback?token=${encodeURIComponent(token)}`;

  await sendMagicLinkEmail(email, magicLink);

  return NextResponse.json({
    ok: true,
    message: "Check your email for the sign-in link.",
  });
}
