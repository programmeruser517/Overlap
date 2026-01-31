import type { ClockPort } from "@overlap/core";

export function createClock(): ClockPort {
  return {
    now() {
      return new Date().toISOString();
    },
  };
}
