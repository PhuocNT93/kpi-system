import { ReviewCadence } from '../domain/review-cadence.types.js';

/** Wire shape of a review cadence (snake_case API contract). */
export interface ReviewCadenceResponse {
  id: string;
  code: string;
  name: string;
  interval_months: number;
  is_system_default: boolean;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

function toIso(value: Date | string | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toReviewCadenceResponse(cadence: ReviewCadence): ReviewCadenceResponse {
  return {
    id: cadence.id,
    code: cadence.code,
    name: cadence.name,
    interval_months: cadence.intervalMonths,
    is_system_default: cadence.isSystemDefault,
    active: cadence.active,
    created_at: toIso(cadence.createdAt),
    updated_at: toIso(cadence.updatedAt),
  };
}
