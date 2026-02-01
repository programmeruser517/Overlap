/**
 * Schedule flow: agents negotiate to find overlap across calendars.
 * Initial stub: returns a mock proposal; later will call CalendarPort and real negotiation.
 */

import type { Proposal, ScheduleProposal } from "../domain/models";
import type { Agent, AgentContext, AgentResult } from "./agent";

export function createNegotiateAgent(_deps: {
  // later: CalendarPort, ClockPort for real slots
}): Agent {
  return {
    async plan(context: AgentContext): Promise<AgentResult> {
      // Stub: pick a placeholder time (e.g. next Monday 10:00–10:30).
      const start = new Date();
      start.setDate(start.getDate() + ((1 + 7 - start.getDay()) % 7));
      start.setHours(10, 0, 0, 0);
      const end = new Date(start);
      end.setMinutes(30);

      const schedule: ScheduleProposal = {
        start: start.toISOString(),
        end: end.toISOString(),
        title: "Meeting",
        participantIds: [context.ownerId, ...context.participantIds],
      };

      const proposal: Proposal = {
        summary: `Schedule: ${schedule.title} on ${start.toLocaleDateString()} ${start.toLocaleTimeString()} – ${end.toLocaleTimeString()} with ${context.participantIds.length + 1} participant(s).`,
        schedule,
      };

      return {
        proposal,
        reasoning: "Stub: placeholder slot; real implementation will compare calendars.",
      };
    },
  };
}
