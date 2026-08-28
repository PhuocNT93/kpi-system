import { z } from 'zod';
import { EvaluationCycleStatus } from '../domain/evaluation-cycle.types.js';

export const CreateEvaluationCycleSchema = z.object({
  code: z.string().min(1, 'code is required').max(50, 'code too long').trim(),
  name: z.string().min(1, 'name is required').max(200, 'name too long').trim(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be in YYYY-MM-DD format'),
  evaluation_template_version_id: z.string().uuid('evaluation_template_version_id must be a valid UUID'),
  applicable_team_ids: z.array(z.string().uuid()).optional().default([]),
  applicable_role_ids: z.array(z.string().uuid()).optional().default([]),
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

export interface EvaluationCycleResponse {
  id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  status: EvaluationCycleStatus;
  evaluation_template_version_id: string;
  applicable_team_ids: string[];
  applicable_role_ids: string[];
  approved_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}
