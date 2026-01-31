/**
 * Wire core use cases with adapters. Single instance for the app (in-memory stubs).
 * When Supabase is configured, getCurrentUserId uses the Supabase session.
 */

import {
  createThread,
  runPlanning,
  approveAction,
  cancelThread,
  createScheduleAgent,
  createEmailAgent,
} from "@overlap/core";
import {
  createMemoryDb,
  createStubAuth,
  createEmailStub,
  createCalendarStub,
  createMemoryAudit,
  createClock,
} from "@overlap/adapters";
import { getUserId as getSupabaseUserId } from "@/lib/supabase/server";

const db = createMemoryDb();
const stubAuth = createStubAuth();
const mail = createEmailStub();
const calendar = createCalendarStub();
const audit = createMemoryAudit();
const clock = createClock();
const scheduleAgent = createScheduleAgent({});
const emailAgent = createEmailAgent({});

export async function getCurrentUserId(): Promise<string | null> {
  const supabaseUserId = await getSupabaseUserId();
  if (supabaseUserId) return supabaseUserId;
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
  async approve(id: string, userId: string) {
    return approveAction(id, userId, {
      db,
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
