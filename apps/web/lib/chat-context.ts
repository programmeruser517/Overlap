import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchCalendarEventsForWeek } from "@/lib/google-calendar";

export type ChatContext = {
  onboardingData: Record<string, unknown>;
  organizationName: string | null;
  organizationStatus: string | null;
  lastEmails: Array<{ from: string; subject: string; date: string }>;
  calendarThisWeek: Array<{ title: string; start: string; end: string }>;
};

const EMAIL_TASK_PATTERN = /email|draft|reply|send\s*(an?\s*)?(email|mail)|follow-?up|inbox/i;
const CALENDAR_TASK_PATTERN = /schedule|meeting|find\s*a\s*time|calendar|plan(ning)?|availability|slot/i;

export function isEmailTask(prompt: string): boolean {
  return EMAIL_TASK_PATTERN.test(prompt);
}

export function isCalendarTask(prompt: string): boolean {
  return CALENDAR_TASK_PATTERN.test(prompt);
}

/**
 * Fetches chat context for the current user: onboarding (user_onboarding),
 * org (organization_requests), and optionally email/calendar stubs.
 * Real Gmail/Calendar data can be wired later via linked_accounts tokens.
 */
export async function getChatContext(
  userId: string,
  options: { includeEmailStub?: boolean; includeCalendarStub?: boolean }
): Promise<ChatContext> {
  const supabase = getSupabaseAdmin();
  const out: ChatContext = {
    onboardingData: {},
    organizationName: null,
    organizationStatus: null,
    lastEmails: [],
    calendarThisWeek: [],
  };

  if (!supabase) return out;

  const { data: onboardingRow } = await (supabase as any)
    .from("user_onboarding")
    .select("onboarding_data")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (onboardingRow?.onboarding_data && typeof onboardingRow.onboarding_data === "object") {
    out.onboardingData = onboardingRow.onboarding_data as Record<string, unknown>;
  }

  const { data: orgRow } = await (supabase as any)
    .from("organization_requests")
    .select("organization_name, status")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (orgRow) {
    out.organizationName = orgRow.organization_name ?? null;
    out.organizationStatus = orgRow.status ?? null;
  }

  if (options.includeEmailStub) {
    // TODO: fetch last 10 emails via Gmail API using linked_accounts token for userId
    out.lastEmails = []; // placeholder; replace with real Gmail list when wired
  }

  if (options.includeCalendarStub) {
    try {
      out.calendarThisWeek = await fetchCalendarEventsForWeek(userId);
    } catch {
      out.calendarThisWeek = [];
    }
  }

  return out;
}

/**
 * Fetches context for another user (e.g. recipient). Used to initialize their "agent"
 * with DB data (onboarding, org). No email/calendar stubs for other user.
 */
export async function getOtherUserContext(otherUserId: string): Promise<ChatContext> {
  return getChatContext(otherUserId, { includeEmailStub: false, includeCalendarStub: false });
}

export function formatContextForPrompt(ctx: ChatContext, prompt: string): string {
  return formatContextForPromptWithOptions(ctx, prompt, {});
}

export function formatContextForPromptWithOptions(
  ctx: ChatContext,
  prompt: string,
  options: { emailRequested?: boolean; calendarRequested?: boolean }
): string {
  const parts: string[] = [];

  parts.push("[Context – current user]");
  parts.push("Onboarding / profile: " + JSON.stringify(ctx.onboardingData));
  if (ctx.organizationName) {
    parts.push(`Organization: ${ctx.organizationName} (status: ${ctx.organizationStatus ?? "unknown"})`);
  } else {
    parts.push("Organization: (none)");
  }

  if (ctx.lastEmails.length > 0) {
    parts.push("");
    parts.push("Last 10 emails (relevant for email tasks):");
    ctx.lastEmails.forEach((e, i) => {
      parts.push(`  ${i + 1}. From: ${e.from} | Subject: ${e.subject} | Date: ${e.date}`);
    });
  } else if (options.emailRequested) {
    parts.push("");
    parts.push("Last 10 emails: (Connect Google in settings to see recent emails)");
  }

  if (ctx.calendarThisWeek.length > 0) {
    parts.push("");
    parts.push("Calendar this week (relevant for scheduling):");
    ctx.calendarThisWeek.forEach((e, i) => {
      parts.push(`  ${i + 1}. ${e.title} | ${e.start} – ${e.end}`);
    });
  } else if (options.calendarRequested) {
    parts.push("");
    parts.push("Calendar this week: (Connect Google in settings to see calendar)");
  }

  if (options.calendarRequested) {
    parts.push("");
    parts.push("Instruction: If you identify any scheduling conflicts or items the user should verify, list them under a line 'Conflicts to verify:' at the end of your response, one item per line.");
  }

  parts.push("");
  parts.push("[User message]");
  parts.push(prompt);

  return parts.join("\n");
}
