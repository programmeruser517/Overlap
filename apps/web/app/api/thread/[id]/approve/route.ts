import { NextResponse } from "next/server";
import { threadApi, getCurrentUserId } from "@/lib/deps";
import { NotFoundError } from "@overlap/core";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    let body: { proposal?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      // no body is ok
    }
    const proposal =
      body.proposal != null &&
      typeof body.proposal === "object" &&
      "summary" in body.proposal
        ? (body.proposal as import("@overlap/core").Proposal)
        : undefined;
    try {
      const thread = await threadApi.approve(id, userId, {
        proposalFromClient: proposal,
      });
      return NextResponse.json({ thread });
    } catch (e) {
      // Thread not in this worker's store (in-memory multi-worker); execute proposal if client sent it
      if (e instanceof NotFoundError && proposal) {
        const thread = await threadApi.executeProposalOnly(id, userId, proposal);
        return NextResponse.json({ thread });
      }
      throw e;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
