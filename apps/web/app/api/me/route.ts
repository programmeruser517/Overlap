import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/deps";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({
      user: { id: userId, displayName: "Stub User" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
