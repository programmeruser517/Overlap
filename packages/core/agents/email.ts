/**
 * Email flow: agent drafts email from prompt (and later: related threads).
 * Initial stub: returns a mock proposal; later will use MailPort / thread context.
 */

import type { Proposal, EmailProposal } from "../domain/models";
import type { Agent, AgentContext, AgentResult } from "./agent";

export function createEmailAgent(_deps: {
  // later: MailPort for thread context, drafts
}): Agent {
  return {
    async plan(context: AgentContext): Promise<AgentResult> {
      // Stub: derive subject and snippet from prompt.
      const subject = context.prompt.slice(0, 50) + (context.prompt.length > 50 ? "…" : "");
      const email: EmailProposal = {
        to: context.participantIds.length ? [] : ["support@example.com"], // stub
        subject,
        bodySnippet: `Draft based on: "${context.prompt.slice(0, 200)}…"`,
      };

      const proposal: Proposal = {
        summary: `Email: To ${email.to.join(", ") || "recipients"}, subject "${email.subject}".`,
        email,
      };

      return {
        proposal,
        reasoning: "Stub: draft from prompt; real implementation will pull related emails.",
      };
    },
  };
}
