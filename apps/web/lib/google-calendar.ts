import { getSupabaseAdmin } from "@/lib/supabase/admin";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export type CalendarEvent = { title: string; start: string; end: string };

/**
 * Fetches the user's Google access token from linked_accounts and refreshes if expired.
 */
async function getValidGoogleAccessToken(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: row, error } = await (supabase as any)
    .from("linked_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .limit(1)
    .single();

  if (error || !row?.access_token) return null;

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // refresh if expires within 5 min

  if (expiresAt > now + bufferMs) {
    return row.access_token;
  }

  const refreshToken = row.refresh_token;
  if (!refreshToken) return row.access_token; // use existing token and hope it works

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return row.access_token;

  const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!refreshRes.ok) return row.access_token;

  const tokenData = (await refreshRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  const newAccessToken = tokenData.access_token;
  if (!newAccessToken) return row.access_token;

  const newExpiresAt = new Date(now + (tokenData.expires_in ?? 3600) * 1000).toISOString();
  await (supabase as any)
    .from("linked_accounts")
    .update({
      access_token: newAccessToken,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "google");

  return newAccessToken;
}

function formatEventTime(d: { dateTime?: string; date?: string }): string {
  if (d.dateTime) {
    const dt = new Date(d.dateTime);
    return dt.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (d.date) {
    const dt = new Date(d.date);
    return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
  return "";
}

/**
 * Fetches upcoming calendar events for the next 7 days using the user's Google token.
 */
export async function fetchCalendarEventsForWeek(userId: string): Promise<CalendarEvent[]> {
  const accessToken = await getValidGoogleAccessToken(userId);
  if (!accessToken) return [];

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL(CALENDAR_LIST_URL);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    items?: Array<{
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  };

  const items = data.items ?? [];
  return items
    .filter((e) => e.start)
    .map((e) => ({
      title: e.summary ?? "(No title)",
      start: formatEventTime(e.start!),
      end: formatEventTime(e.end ?? e.start!),
    }));
}
