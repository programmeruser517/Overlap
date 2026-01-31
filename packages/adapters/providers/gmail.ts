/**
 * Gmail MailPort implementation. Later: OAuth + Gmail API.
 */

import type { MailPort } from "@overlap/core";

export function createGmailMail(_config: { credentials: unknown }): MailPort {
  return {
    async send() {
      throw new Error("Gmail adapter not implemented yet");
    },
  };
}
