import type { Action } from "../domain/models";
import { InvalidProposalError } from "../domain/errors";

function isStringArray(a: unknown): a is string[] {
  return Array.isArray(a) && a.every((x) => typeof x === "string");
}

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && !Number.isNaN(Date.parse(s));
}

export function validateAction(a: unknown): a is Action {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  if (o.type === "send_email") {
    return (
      isStringArray(o.to) &&
      typeof o.subject === "string" &&
      typeof o.body === "string"
    );
  }
  if (o.type === "create_event") {
    return (
      isIsoDate(o.start) &&
      isIsoDate(o.end) &&
      typeof o.title === "string" &&
      isStringArray(o.participantIds)
    );
  }
  return false;
}

export function assertAction(a: unknown): asserts a is Action {
  if (!validateAction(a)) {
    throw new InvalidProposalError("Invalid action shape");
  }
}
