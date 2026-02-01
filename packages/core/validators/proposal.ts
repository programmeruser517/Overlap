import type { Proposal, ScheduleProposal, EmailProposal } from "../domain/models";
import { InvalidProposalError } from "../domain/errors";

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && !Number.isNaN(Date.parse(s));
}

function isStringArray(a: unknown): a is string[] {
  return Array.isArray(a) && a.every((x) => typeof x === "string");
}

export function validateScheduleProposal(p: unknown): p is ScheduleProposal {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    isIsoDate(o.start) &&
    isIsoDate(o.end) &&
    isStringArray(o.participantIds) &&
    (o.title === undefined || typeof o.title === "string")
  );
}

export function validateEmailProposal(p: unknown): p is EmailProposal {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    isStringArray(o.to) &&
    typeof o.subject === "string" &&
    typeof o.bodySnippet === "string"
  );
}

export function validateProposal(p: unknown): p is Proposal {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  if (typeof o.summary !== "string") return false;
  if (o.schedule !== undefined && !validateScheduleProposal(o.schedule)) return false;
  if (o.email !== undefined && !validateEmailProposal(o.email)) return false;
  return o.schedule != null || o.email != null;
}

export function assertProposal(p: unknown): asserts p is Proposal {
  if (!validateProposal(p)) {
    throw new InvalidProposalError("Invalid proposal shape");
  }
}
