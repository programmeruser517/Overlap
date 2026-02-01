/**
 * Schedule flow: agents negotiate to find overlap across calendars.
 * Invokes each participant's "agent" data (calendar) via CalendarPort and finds first free slot.
 */

import type { Proposal, ScheduleProposal } from "../domain/models";
import type { CalendarPort } from "../ports/CalendarPort";
import type { Agent, AgentContext, AgentResult } from "./agent";

const SLOT_MINUTES = 30;
const WINDOW_DAYS = 14;

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function createNegotiateAgent(deps: { calendar: CalendarPort }): Agent {
  return {
    async plan(context: AgentContext): Promise<AgentResult> {
      const allParticipantIds = [context.ownerId, ...context.participantIds];
      const now = new Date();
      const windowStart = new Date(now);
      windowStart.setMinutes(0, 0, 0);
      const windowEnd = new Date(windowStart);
      windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS);
      const fromISO = windowStart.toISOString();
      const toISO = windowEnd.toISOString();

      const busyByUser = new Map<string, Array<{ start: number; end: number }>>();
      for (const userId of allParticipantIds) {
        const slots = await deps.calendar.getBusySlots(userId, fromISO, toISO);
        busyByUser.set(
          userId,
          slots.map((s) => ({
            start: new Date(s.start).getTime(),
            end: new Date(s.end).getTime(),
          }))
        );
      }

      const slotMs = SLOT_MINUTES * 60 * 1000;
      const startMs = windowStart.getTime();
      const endMs = windowEnd.getTime();
      let chosen: { start: Date; end: Date } | null = null;

      for (let t = startMs; t + slotMs <= endMs; t += slotMs) {
        const slotStart = t;
        const slotEnd = t + slotMs;
        const freeForAll = allParticipantIds.every((userId) => {
          const busy = busyByUser.get(userId) ?? [];
          return !busy.some((b) => overlap(slotStart, slotEnd, b.start, b.end));
        });
        if (freeForAll) {
          chosen = {
            start: new Date(slotStart),
            end: new Date(slotEnd),
          };
          break;
        }
      }

      if (!chosen) {
        const fallbackStart = new Date(now);
        fallbackStart.setDate(fallbackStart.getDate() + 1);
        fallbackStart.setHours(10, 0, 0, 0);
        const fallbackEnd = new Date(fallbackStart);
        fallbackEnd.setMinutes(fallbackStart.getMinutes() + SLOT_MINUTES);
        chosen = { start: fallbackStart, end: fallbackEnd };
      }

      const schedule: ScheduleProposal = {
        start: chosen.start.toISOString(),
        end: chosen.end.toISOString(),
        title: "Meeting",
        participantIds: allParticipantIds,
      };

      const proposal: Proposal = {
        summary: `Schedule: ${schedule.title} on ${chosen.start.toLocaleDateString()} ${chosen.start.toLocaleTimeString()} – ${chosen.end.toLocaleTimeString()} with ${allParticipantIds.length} participant(s).`,
        schedule,
      };

      const reasoning =
        allParticipantIds.length === 1
          ? "Checked your calendar for a free slot."
          : `Compared ${allParticipantIds.length} calendars; found first shared free slot.`;

      return { proposal, reasoning };
    },
  };
}
