import { getApi, postApi } from '@/shared/api/api-client';
import { randomUUID } from '@/shared/utils/uuid';
import type {
  ReviewDueFiltersDTO,
  ReviewDueResponseDTO,
  CreateIndividualCyclesPayload,
  CreateIndividualCyclesResultDTO,
} from '../types/review-due.types';
import type { IndividualCycleCreateResponseWire } from './cycle-api';

/**
 * Adapts the POST /evaluation-cycles/individual response ({ created, skipped, warnings }) to the
 * shape the Review Due Dashboard modal renders ({ created, warnings, conflicts }).
 */
export function toReviewDueIndividualResult(raw: IndividualCycleCreateResponseWire): CreateIndividualCyclesResultDTO {
  const seenWarnings = new Set<string>();
  return {
    created: (raw.created ?? []).map((entry) => ({
      cycle_id: entry.evaluation_cycle.id,
      evaluation_id: entry.evaluation_id,
      employee_id: entry.employee_id,
      code: entry.evaluation_cycle.code,
    })),
    warnings: (raw.warnings ?? [])
      .filter((warning) => {
        const key = `${warning.employee_id}:${warning.evaluation_cycle_id}`;
        if (seenWarnings.has(key)) return false;
        seenWarnings.add(key);
        return true;
      })
      .map((warning) => ({
        employee_id: warning.employee_id,
        warning: {
          code: warning.code,
          cycle_code: warning.evaluation_cycle_code,
          cycle_name: warning.evaluation_cycle_name,
          scheduled_date: warning.start_date,
        },
      })),
    conflicts: (raw.skipped ?? []).map((skip) => ({
      employee_id: skip.employee_id,
      code: skip.reason_code,
      message: `Employee already has an active evaluation (${skip.existing_evaluation_id}).`,
    })),
  };
}

export const reviewDueApi = {
  getReviewDue: async (filters?: ReviewDueFiltersDTO): Promise<ReviewDueResponseDTO> => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') {
      params.append('status', filters.status);
    }
    if (filters?.team_id) {
      params.append('team_id', filters.team_id);
    }
    if (filters?.cadence_id) {
      params.append('cadence_id', filters.cadence_id);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.lead_time_days !== undefined) {
      params.append('lead_time_days', String(filters.lead_time_days));
    }
    if (filters?.limit !== undefined) {
      params.append('limit', String(filters.limit));
    }
    if (filters?.offset !== undefined) {
      params.append('offset', String(filters.offset));
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return getApi<ReviewDueResponseDTO>(`/api/reviews/due${queryString}`);
  },

  createIndividualCycles: async (
    payload: CreateIndividualCyclesPayload
  ): Promise<CreateIndividualCyclesResultDTO> => {
    const raw = await postApi<IndividualCycleCreateResponseWire>(
      '/api/evaluation-cycles/individual',
      payload,
      randomUUID()
    );
    return toReviewDueIndividualResult(raw);
  },
};
