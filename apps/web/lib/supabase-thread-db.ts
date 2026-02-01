/**
 * Supabase-backed DbPort for threads so previous threads load after refresh/session.
 * Uses threads table (see packages/adapters/supabase/schema.sql).
 */

import type { Thread, Participant, Proposal } from "@overlap/core";
import type { DbPort } from "@overlap/core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Row = {
  id: string;
  owner_id: string;
  kind: string;
  status: string;
  prompt: string;
  participants: unknown;
  proposal: unknown;
  executed_at: string | null;
  view_mode: string | null;
  created_at: string;
  updated_at: string;
};

function rowToThread(row: Row): Thread {
  const participants = (row.participants as Participant[]) ?? [];
  const viewMode = row.view_mode === "linear" || row.view_mode === "graph" ? row.view_mode : undefined;
  return {
    id: row.id,
    ownerId: row.owner_id,
    kind: row.kind as Thread["kind"],
    status: row.status as Thread["status"],
    prompt: row.prompt,
    participants: Array.isArray(participants)
      ? participants.map((p) => ({
          userId: (p as { userId?: string }).userId ?? (p as { user_id?: string }).user_id ?? "",
          email: (p as { email?: string }).email,
          displayName: (p as { displayName?: string }).displayName ?? (p as { display_name?: string }).display_name,
        }))
      : [],
    proposal: row.proposal as Proposal | undefined,
    executedAt: row.executed_at ?? undefined,
    viewMode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSupabaseThreadDb(): DbPort | null {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  return {
    async createThread(thread): Promise<Thread> {
      const id = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const now = thread.createdAt ?? new Date().toISOString();
      const viewMode = thread.viewMode === "linear" || thread.viewMode === "graph" ? thread.viewMode : null;
      const row = {
        id,
        owner_id: thread.ownerId,
        kind: thread.kind,
        status: thread.status,
        prompt: thread.prompt,
        participants: thread.participants,
        proposal: thread.proposal ?? null,
        executed_at: thread.executedAt ?? null,
        view_mode: viewMode,
        created_at: now,
        updated_at: thread.updatedAt ?? now,
      };
      const { data, error } = await (supabase as any)
        .from("threads")
        .insert(row)
        .select()
        .single();
      if (error) throw new Error(`Failed to create thread: ${error.message}`);
      return rowToThread(data as Row);
    },

    async getThread(id: string): Promise<Thread | null> {
      const { data, error } = await (supabase as any)
        .from("threads")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`Failed to get thread: ${error.message}`);
      return data ? rowToThread(data as Row) : null;
    },

    async updateThread(id: string, patch: Partial<Thread>): Promise<Thread | null> {
      const patchRow: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (patch.status != null) patchRow.status = patch.status;
      if (patch.prompt != null) patchRow.prompt = patch.prompt;
      if (patch.participants != null) patchRow.participants = patch.participants;
      if (patch.proposal !== undefined) patchRow.proposal = patch.proposal ?? null;
      if (patch.executedAt !== undefined) patchRow.executed_at = patch.executedAt ?? null;
      if (patch.viewMode !== undefined) patchRow.view_mode = patch.viewMode === "linear" || patch.viewMode === "graph" ? patch.viewMode : null;
      const { data, error } = await (supabase as any)
        .from("threads")
        .update(patchRow)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw new Error(`Failed to update thread: ${error.message}`);
      return data ? rowToThread(data as Row) : null;
    },

    async listThreadsForUser(userId: string): Promise<Thread[]> {
      const { data, error } = await (supabase as any)
        .from("threads")
        .select("*")
        .eq("owner_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(`Failed to list threads: ${error.message}`);
      return (data ?? []).map((row: Row) => rowToThread(row));
    },
  };
}
