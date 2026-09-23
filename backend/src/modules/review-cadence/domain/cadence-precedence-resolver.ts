import { ReviewCadence } from './review-cadence.types.js';

/**
 * CadencePrecedenceInput — the three possible cadence sources, pre-loaded by the caller.
 * All values may be null if not configured.
 *
 * Precedence (LLD §14.1):
 *   employee.review_cadence_override_id
 *     ↓
 *   job_level.default_review_cadence_id
 *     ↓
 *   review_cadence.is_system_default = true
 */
export interface CadencePrecedenceInput {
  /** Set when employee has an explicit override cadence. */
  employeeOverride: ReviewCadence | null;
  /** Set when the employee's job level has a default cadence. */
  jobLevelDefault: ReviewCadence | null;
  /** The single row with is_system_default = true, or null if none configured. */
  systemDefault: ReviewCadence | null;
}

/**
 * resolveEffectiveCadence — pure, stateless resolver.
 *
 * Rules:
 * - Does NOT access the database.
 * - Does NOT throw; returns null when no cadence can be determined.
 * - Caller is responsible for loading the required ReviewCadence objects.
 */
export function resolveEffectiveCadence(
  input: CadencePrecedenceInput
): ReviewCadence | null {
  return input.employeeOverride ?? input.jobLevelDefault ?? input.systemDefault;
}
