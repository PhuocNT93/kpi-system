import { z } from 'zod';
import { EvaluationCycleStatus, EvaluationCycleType } from '../domain/evaluation-cycle.types.js';

export const CreateEvaluationCycleSchema = z.object({
  code: z.string().min(1, 'code is required').max(50, 'code too long').trim(),
  name: z.string().min(1, 'name is required').max(200, 'name too long').trim(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be in YYYY-MM-DD format'),
  evaluation_template_version_id: z.string().uuid('evaluation_template_version_id must be a valid UUID'),
  applicable_team_ids: z.array(z.string().uuid()).optional().default([]),
  applicable_role_ids: z.array(z.string().uuid()).optional().default([]),
  applicable_employee_ids: z.array(z.string().uuid()).optional().default([]),
}).refine((data) => data.start_date <= data.end_date, {
  message: 'start_date must be less than or equal to end_date',
  path: ['end_date'],
});

export type CreateEvaluationCycleInput = z.infer<typeof CreateEvaluationCycleSchema>;

export const UpdateEvaluationCycleSchema = z.object({
  code: z.string().min(1).max(50).trim().optional(),
  name: z.string().min(1).max(200).trim().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  evaluation_template_version_id: z.string().uuid().optional(),
  applicable_team_ids: z.array(z.string().uuid()).optional(),
  applicable_role_ids: z.array(z.string().uuid()).optional(),
  applicable_employee_ids: z.array(z.string().uuid()).optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return data.start_date <= data.end_date;
  }
  return true;
}, {
  message: 'start_date must be less than or equal to end_date',
  path: ['end_date'],
});

export type UpdateEvaluationCycleInput = z.infer<typeof UpdateEvaluationCycleSchema>;

export const ListEvaluationCycleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(EvaluationCycleStatus).optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  sort_direction: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
});

export type ListEvaluationCycleQueryInput = z.infer<typeof ListEvaluationCycleQuerySchema>;

export const TransitionEvaluationCycleSchema = z.object({
  target_status: z.nativeEnum(EvaluationCycleStatus),
});

export type TransitionEvaluationCycleInput = z.infer<typeof TransitionEvaluationCycleSchema>;

export const MAX_INDIVIDUAL_CYCLE_EMPLOYEES = 100;

export const CreateIndividualCyclesSchema = z.object({
  name: z.string().trim().min(1, 'name must not be empty').max(140, 'name too long').optional(),
  /** Optional: when neither this nor `template_version_id` is given, the latest PUBLISHED version is used. */
  evaluation_template_version_id: z.string().uuid('evaluation_template_version_id must be a valid UUID').optional(),
  /** Alias accepted for the Review Due Dashboard client. */
  template_version_id: z.string().uuid('template_version_id must be a valid UUID').optional(),
  employee_ids: z
    .array(z.string().uuid('employee_ids must contain valid UUIDs'))
    .min(1, 'employee_ids must contain at least one employee')
    .max(MAX_INDIVIDUAL_CYCLE_EMPLOYEES, `employee_ids must contain at most ${MAX_INDIVIDUAL_CYCLE_EMPLOYEES} employees`),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be in YYYY-MM-DD format'),
}).refine((data) => data.start_date <= data.end_date, {
  message: 'start_date must be less than or equal to end_date',
  path: ['end_date'],
});

export type CreateIndividualCyclesInput = z.infer<typeof CreateIndividualCyclesSchema>;

export interface EvaluationCycleResponse {
  id: string;
  code: string;
  name: string;
  cycle_type: EvaluationCycleType;
  triggered_by_employee_id: string | null;
  start_date: string;
  end_date: string;
  status: EvaluationCycleStatus;
  evaluation_template_version_id: string;
  applicable_team_ids: string[];
  applicable_role_ids: string[];
  applicable_employee_ids: string[];
  approved_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface IndividualCycleCreatedResponse {
  evaluation_cycle: EvaluationCycleResponse;
  employee_id: string;
  evaluation_id: string;
  evaluation_item_count: number;
}

export interface IndividualCycleSkippedResponse {
  employee_id: string;
  reason_code: string;
  existing_evaluation_id: string;
  existing_evaluation_cycle_id: string;
}

export interface IndividualCycleWarningResponse {
  code: string;
  employee_id: string;
  evaluation_cycle_id: string;
  evaluation_cycle_code: string;
  evaluation_cycle_name: string;
  start_date: string;
  message: string;
}

export interface IndividualCycleCreationResponse {
  created: IndividualCycleCreatedResponse[];
  skipped: IndividualCycleSkippedResponse[];
  warnings: IndividualCycleWarningResponse[];
}
