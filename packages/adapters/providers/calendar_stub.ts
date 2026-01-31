/**
 * MVP stub: log only, do not create events.
 */

import type { CalendarPort } from "@overlap/core";

export function createCalendarStub(): CalendarPort {
  return {
    async getBusySlots(userId, from, to) {
      console.log("[calendar_stub] getBusySlots", { userId, from, to });
      return [];
    },

    async createEvent(userId, input) {
      console.log("[calendar_stub] would create event:", { userId, input });
    },
  };
}
