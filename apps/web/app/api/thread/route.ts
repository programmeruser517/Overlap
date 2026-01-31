import { NextResponse } from "next/server";
import { threadApi, getCurrentUserId } from "@/lib/deps";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { kind, prompt, participants } = body;
    if (!kind || !prompt) {
      return NextResponse.json(
        { error: "kind and prompt required" },
        { status: 400 }
      );
    }
    const thread = await threadApi.create(
      kind,
      prompt,
      Array.isArray(participants) ? participants : []
    );
    return NextResponse.json({ thread });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const threads = await threadApi.list(userId);
    return NextResponse.json({ threads });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
