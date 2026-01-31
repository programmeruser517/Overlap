/**
 * Google Calendar CalendarPort implementation. Later: OAuth + Calendar API.
 */

import type { CalendarPort } from "@overlap/core";

export function createGoogleCalendar(_config: { credentials: unknown }): CalendarPort {
  return {
    async getBusySlots() {
      return [];
    },
    async createEvent() {
      throw new Error("Google Calendar adapter not implemented yet");
    },
  };
}
