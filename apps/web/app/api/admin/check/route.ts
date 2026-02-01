import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("demo_admin")?.value === "1";
  return NextResponse.json({ isAdmin });
}
