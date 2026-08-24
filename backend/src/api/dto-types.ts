/**
 * Shared DTO type conventions (BACKEND_NODE_RULES §6).
 *
 * This file exports re-usable base interfaces and naming conventions for
 * request and response DTOs across all modules. Import only what is needed.
 *
 * Naming rules:
 *  - Request DTOs  : <Action><Resource>Request  (e.g. CreateEmployeeRequest)
 *  - Response DTOs : <Resource>Response         (e.g. EmployeeResponse)
 *  - Page responses: <Resource>PageResponse     (e.g. EmployeePageResponse)
 *
 * Wire rules:
 *  - All field names: snake_case
 *  - Booleans begin with is_, has_, can_
 *  - Timestamps end with _at (ISO-8601 string on the wire)
 *  - UUIDs surfaced as string
 *  - Do not return ORM entities directly; map at the API boundary.
 */

// ── Base shapes ───────────────────────────────────────────────────────────────

/** Minimum fields every persisted resource exposes. */
export interface BaseResourceResponse {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Annotates a response body that carries optimistic-locking state.
 * Clients must echo `version` in the corresponding update request.
 */
export interface VersionedResponse {
  version: number;
}

/**
 * Standard shape for any update request that must carry the client's last
 * known version number (optimistic locking — returns 409 on mismatch).
 */
export interface VersionedRequest {
  version: number;
}

// ── Identifier conventions ────────────────────────────────────────────────────

/**
 * Typed alias for UUID v4 strings used as entity primary keys.
 * Using a branded string prevents accidentally mixing up IDs at compile time.
 */
export type UuidV4 = string & { readonly __brand: 'UuidV4' };

// ── Common filter shapes ──────────────────────────────────────────────────────

/**
 * Common date-range filter present on many list endpoints.
 * Both fields are optional; if both supplied, `from` must be ≤ `to`.
 */
export interface DateRangeFilter {
  /** ISO-8601 date or datetime string (inclusive lower bound) */
  from?: string;
  /** ISO-8601 date or datetime string (inclusive upper bound) */
  to?: string;
}
