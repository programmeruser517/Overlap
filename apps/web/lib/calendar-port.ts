/**
 * CalendarPort implementation using Google Calendar API per user.
 * Each user's "agent" data (calendar) is fetched by userId for orchestration.
 * createEvent adds the meeting to the owner's primary Google Calendar when they approve.
 */

import type { CalendarPort, CalendarSlot, CreateEventInput } from "@overlap/core";
import { fetchCalendarBusySlots, createCalendarEvent } from "@/lib/google-calendar";

export function createWebCalendarPort(): CalendarPort {
  return {
    async getBusySlots(userId: string, from: string, to: string): Promise<CalendarSlot[]> {
      return fetchCalendarBusySlots(userId, from, to);
    },

    async createEvent(userId: string, input: CreateEventInput): Promise<void> {
      await createCalendarEvent(userId, {
        start: input.start,
        end: input.end,
        title: input.title ?? "Meeting",
      });
    },
  };
}
