/**
 * Outlook MailPort implementation. Later: MS OAuth + Graph API.
 */

import type { MailPort } from "@overlap/core";

export function createOutlookMail(_config: { credentials: unknown }): MailPort {
  return {
    async send() {
      throw new Error("Outlook adapter not implemented yet");
    },
  };
}
