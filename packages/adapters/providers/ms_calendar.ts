/**
 * Microsoft Calendar CalendarPort implementation. Later: MS OAuth + Graph API.
 */

import type { CalendarPort } from "@overlap/core";

export function createMsCalendar(_config: { credentials: unknown }): CalendarPort {
  return {
    async getBusySlots() {
      return [];
    },
    async createEvent() {
      throw new Error("MS Calendar adapter not implemented yet");
    },
  };
}
