import { getApi, postApi } from '@/shared/api/api-client';
import { randomUUID } from '@/shared/utils/uuid';
import type {
  ReviewDueFiltersDTO,
  ReviewDueResponseDTO,
  ReviewDueItemDTO,
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
    const res = await getApi<any>(`/api/reviews/due${queryString}`);
    const rawItems: any[] = Array.isArray(res?.items) ? res.items : [];

    const items: ReviewDueItemDTO[] = rawItems.map((item: any) => {
      const fullName = item.full_name || item.employee_name || item.name || 'Unknown Employee';
      const employeeCode = item.employee_code || (item.employee_id ? String(item.employee_id).slice(0, 8) : 'EMP');
      const teamId = item.team_id ?? item.team?.id ?? null;
      const teamName = item.team_name ?? item.team?.name ?? null;
      const jobLevelId = item.job_level_id ?? item.job_level?.id ?? null;
      const jobLevelName = item.job_level_name ?? item.job_level?.name ?? null;

      const effectiveCadence = item.effective_cadence
        ? {
            id: item.effective_cadence.id || '',
            code: item.effective_cadence.code || '',
            name: item.effective_cadence.name || '',
            interval_months: item.effective_cadence.interval_months || 0,
            source: item.effective_cadence.source || 'SYSTEM_DEFAULT',
          }
        : null;

      return {
        employee_id: item.employee_id || '',
        employee_code: employeeCode,
        full_name: fullName,
        team_id: teamId,
        team_name: teamName,
        job_level_id: jobLevelId,
        job_level_name: jobLevelName,
        last_evaluation_completed_at: item.last_evaluation_completed_at || null,
        next_review_due_date: item.next_review_due_date || null,
        status: item.status || 'NOT_DUE',
        days_overdue: item.days_overdue ?? 0,
        days_until_due: item.days_until_due ?? 0,
        effective_cadence: effectiveCadence,
      };
    });

    const overdueCount = items.filter((i) => i.status === 'OVERDUE').length;
    const dueCount = items.filter((i) => i.status === 'DUE').length;
    const upcomingCount = items.filter((i) => i.status === 'UPCOMING').length;

    const counts = res?.meta?.counts || {
      overdue: overdueCount,
      due: dueCount,
      upcoming: upcomingCount,
      total_due_or_upcoming: overdueCount + dueCount + upcomingCount,
    };

    return {
      items,
      meta: {
        total: res?.total ?? items.length,
        lead_time_days: res?.meta?.lead_time_days ?? 30,
        counts,
      },
    };
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
