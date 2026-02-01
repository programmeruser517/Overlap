/**
 * Wire core use cases with adapters. Single instance for the app (in-memory stubs).
 * When Supabase is configured, getCurrentUserId uses the Supabase session.
 */

import {
  createThread,
  runPlanning,
  approveAction,
  executeProposalWithoutThread,
  cancelThread,
  createScheduleAgent,
  createEmailAgent,
} from "@overlap/core";
import {
  createMemoryDb,
  createStubAuth,
  createEmailStub,
  createMemoryAudit,
  createClock,
} from "@overlap/adapters";
import { getUserId as getSupabaseUserId } from "@/lib/supabase/server";
import { createWebCalendarPort } from "@/lib/calendar-port";
import { createSupabaseThreadDb } from "@/lib/supabase-thread-db";

const supabaseThreadDb = createSupabaseThreadDb();
const db = supabaseThreadDb ?? createMemoryDb();
const stubAuth = createStubAuth();
const mail = createEmailStub();
const calendar = createWebCalendarPort();
const audit = createMemoryAudit();
const clock = createClock();
const scheduleAgent = createScheduleAgent({ calendar });
const emailAgent = createEmailAgent({});

export async function getCurrentUserId(): Promise<string | null> {
  const supabaseUserId = await getSupabaseUserId();
  if (supabaseUserId) return supabaseUserId;
  // When using Supabase DB, don't use stub – require real session so ownership checks match DB.
  if (supabaseThreadDb) return null;
  return stubAuth.getCurrentUserId();
}

export const threadApi = {
  async create(kind: "schedule" | "email", prompt: string, participants: { userId: string }[]) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");
    return createThread(
      { ownerId: userId, kind, prompt, participants },
      { db, clock }
    );
  },
  async get(id: string) {
    return db.getThread(id);
  },
  async update(id: string, patch: { prompt?: string; participants?: { userId: string }[]; kind?: "schedule" | "email" }) {
    const now = clock.now();
    return db.updateThread(id, { ...patch, updatedAt: now });
  },
  async list(userId: string) {
    return db.listThreadsForUser(userId);
  },
  async run(id: string) {
    return runPlanning(id, {
      db,
      clock,
      audit,
      scheduleAgent,
      emailAgent,
    });
  },
  async approve(
    id: string,
    userId: string,
    options?: { proposalFromClient?: import("@overlap/core").Proposal }
  ) {
    return approveAction(id, userId, {
      db,
      clock,
      mail,
      calendar,
      audit,
    }, options);
  },
  /** Execute proposal when thread is not in this worker's store (e.g. in-memory multi-worker). */
  async executeProposalOnly(
    id: string,
    userId: string,
    proposal: import("@overlap/core").Proposal
  ) {
    return executeProposalWithoutThread(id, userId, proposal, {
      clock,
      mail,
      calendar,
      audit,
    });
  },
  async cancel(id: string, userId: string) {
    return cancelThread(id, userId, { db, clock, audit });
  },
};
