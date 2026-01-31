export class OverlapError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "OverlapError";
  }
}

export class NotFoundError extends OverlapError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends OverlapError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class InvalidProposalError extends OverlapError {
  constructor(message: string) {
    super(message, "INVALID_PROPOSAL");
    this.name = "InvalidProposalError";
  }
}
