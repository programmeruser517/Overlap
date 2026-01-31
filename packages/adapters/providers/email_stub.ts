/**
 * MVP stub: log only, do not send email.
 */

import type { MailPort } from "@overlap/core";

export function createEmailStub(): MailPort {
  return {
    async send(input) {
      console.log("[email_stub] would send:", JSON.stringify(input, null, 2));
    },
  };
}
