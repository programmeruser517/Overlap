import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const enabled = process.env.DEMO_ADMIN_ENABLED === "true";
  const expected = process.env.DEMO_ADMIN_PASSWORD;

  if (!enabled) {
    return NextResponse.json({ error: "Demo admin disabled" }, { status: 403 });
  }

  const provided = typeof body.password === "string" ? body.password : "";

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Invalid demo admin password" }, { status: 401 });
  }

  // Set a cookie that /api/admin/check will read
  const cookieStore = await cookies();
  cookieStore.set("demo_admin", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60, // 1 hour
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set("demo_admin", "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
