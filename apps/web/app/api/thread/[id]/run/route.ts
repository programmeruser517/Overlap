import { NextResponse } from "next/server";
import { threadApi } from "@/lib/deps";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await threadApi.run(id);
    return NextResponse.json({ thread: result.thread, reasoning: result.reasoning });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
