import { NextResponse } from "next/server";
import { threadApi, getCurrentUserId } from "@/lib/deps";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { kind, prompt, participants, viewMode } = body;
    if (!kind) {
      return NextResponse.json(
        { error: "kind required" },
        { status: 400 }
      );
    }
    const promptStr = typeof prompt === "string" ? prompt : "";
    const view = viewMode === "linear" || viewMode === "graph" ? viewMode : undefined;
    const thread = await threadApi.create(
      kind,
      promptStr,
      Array.isArray(participants) ? participants : [],
      view
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
    const all = await threadApi.list(userId);
    const threads = all.filter((t) => t.status === "done" || t.status === "cancelled");
    return NextResponse.json({ threads });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
