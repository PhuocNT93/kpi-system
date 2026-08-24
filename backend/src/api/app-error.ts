/**
 * AppError — domain error with a stable machine-readable code and an HTTP status.
 *
 * Rules (BACKEND_NODE_RULES §4):
 *  - code  : SCREAMING_SNAKE_CASE, stable across releases
 *  - status: maps to HTTP status codes per the approved convention
 *  - field : snake_case request field name or null
 *  - details: array of per-field validation errors (validation failures only)
 */

export interface ValidationDetail {
  field: string;
  code: string;
  message: string;
}

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field: string | null;
  readonly details: ValidationDetail[];

  constructor(
    status: number,
    code: string,
    message: string,
    field: string | null = null,
    details: ValidationDetail[] = []
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.field = field;
    this.details = details;
  }
}

// ── Specific Error Classes (status codes per BACKEND_NODE_RULES §4) ──────────

/** 400 – request-level validation failure */
export class BadRequest extends AppError {
  constructor(
    message: string,
    code = 'BAD_REQUEST',
    field: string | null = null,
    details: ValidationDetail[] = []
  ) {
    super(400, code, message, field, details);
  }
}

/** 400 – one or more field-level validation errors */
export class ValidationError extends AppError {
  constructor(message: string, details: ValidationDetail[]) {
    super(400, 'VALIDATION_ERROR', message, null, details);
  }
}

/** 401 – missing or invalid authentication */
export class Unauthenticated extends AppError {
  constructor(message = 'Authentication required.') {
    super(401, 'UNAUTHENTICATED', message);
  }
}

/** 403 – authenticated but forbidden / scope violation */
export class Forbidden extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(403, 'FORBIDDEN', message);
  }
}

/** 404 – resource absent */
export class NotFound extends AppError {
  constructor(resource: string) {
    super(404, 'RESOURCE_NOT_FOUND', `${resource} was not found.`);
  }
}

/** 409 – conflict: lock, version mismatch, or duplicate */
export class Conflict extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(409, code, message);
  }
}

/** 409 – optimistic locking version mismatch */
export class VersionMismatch extends Conflict {
  constructor(resource = 'Resource') {
    super(`${resource} was modified by another request. Please refresh and retry.`, 'VERSION_MISMATCH');
  }
}

/** 409 – the target evaluation/cycle is locked and cannot be mutated */
export class Locked extends Conflict {
  constructor(resource = 'Resource') {
    super(`${resource} is locked and cannot be changed.`, 'LOCKED');
  }
}

/** 422 – business-rule violation (state-dependent) */
export class Unprocessable extends AppError {
  constructor(message: string, code = 'UNPROCESSABLE') {
    super(422, code, message);
  }
}
