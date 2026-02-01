import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = process.env.DEMO_ADMIN_COOKIE || "overlap_demo_admin";

export async function POST(req: Request) {
  // Never allow this in prod unless you explicitly want it
  if (process.env.DEMO_ADMIN_ENABLED !== "true") {
    return NextResponse.json({ error: "Demo admin disabled" }, { status: 403 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const expected = process.env.DEMO_ADMIN_PASSWORD || "";
  const provided = typeof body.password === "string" ? body.password : "";

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  // Set httpOnly cookie so client JS can't read it
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
