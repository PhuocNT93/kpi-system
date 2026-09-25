// Wire → Domain (and Domain → Wire filter) mappers for the Review Due dashboard.
// All snake_case ↔ camelCase conversion for this feature happens here.

import type {
  EffectiveCadenceDTO,
  ReviewDueFiltersDTO,
  ReviewDueItemDTO,
  ReviewDueResponseDTO,
} from '../types/review-due.types';
import type { ReviewDueCadence, ReviewDueFilters, ReviewDueItem, ReviewDuePage } from './review-due-models';

export function mapReviewDueCadenceToDomain(wire: EffectiveCadenceDTO | null | undefined): ReviewDueCadence | null {
  if (!wire) return null;
  return {
    id: wire.id,
    code: wire.code,
    name: wire.name,
    intervalMonths: wire.interval_months,
    source: wire.source,
  };
}

export function mapReviewDueItemToDomain(wire: ReviewDueItemDTO): ReviewDueItem {
  return {
    employeeId: wire.employee_id,
    employeeCode: wire.employee_code,
    employeeName: wire.employee_name,
    teamName: wire.team?.name ?? null,
    jobLevelName: wire.job_level?.name ?? null,
    effectiveCadence: mapReviewDueCadenceToDomain(wire.effective_cadence),
    lastEvaluationCompletedAt: wire.last_evaluation_completed_at,
    nextReviewDueDate: wire.next_review_due_date,
    status: wire.status,
    daysOverdue: wire.days_overdue,
  };
}

export function mapReviewDueResponseToDomain(wire: ReviewDueResponseDTO): ReviewDuePage {
  return {
    items: (wire.items ?? []).map(mapReviewDueItemToDomain),
    total: wire.total,
    page: wire.page,
    pageSize: wire.pageSize,
    totalPages: wire.totalPages,
    lastUpdatedAt: wire.last_updated_at,
  };
}

export function mapReviewDueFiltersToWire(filters?: ReviewDueFilters): ReviewDueFiltersDTO {
  if (!filters) return {};
  return {
    status: filters.status,
    team_id: filters.teamId,
    cadence_id: filters.cadenceId,
    search: filters.search,
    page: filters.page,
    page_size: filters.pageSize,
  };
}
