import { z } from 'zod';

export const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const uuidSchema = z.string().regex(uuidRegex, 'Invalid UUID format');

export const getReportQuerySchema = z.object({
  cycleId: z.string().regex(uuidRegex, 'Invalid cycleId format').min(1, 'cycleId is required'),
});

export type GetReportQueryDto = z.infer<typeof getReportQuerySchema>;

export const getEmployeeKpiSummaryQuerySchema = z.object({
  evaluation_cycle_id: z.string().regex(uuidRegex, 'Invalid evaluation_cycle_id format').optional(),
  evaluationCycleId: z.string().regex(uuidRegex, 'Invalid evaluationCycleId format').optional(),
  evaluation_status: z.string().optional(),
  evaluationStatus: z.string().optional(),
});

export type GetEmployeeKpiSummaryQueryDto = z.infer<typeof getEmployeeKpiSummaryQuerySchema>;

export const getDashboardQuerySchema = z.object({
  cycleId: z.string().regex(uuidRegex, 'Invalid cycleId format').optional(),
  evaluation_cycle_id: z.string().regex(uuidRegex, 'Invalid evaluation_cycle_id format').optional(),
  evaluationCycleId: z.string().regex(uuidRegex, 'Invalid evaluationCycleId format').optional(),
});

export type GetDashboardQueryDto = z.infer<typeof getDashboardQuerySchema>;

/**
 * KPI Trend response model representing a single KPI's performance across two cycles.
 * Status can be MATCHED, NEW, or REMOVED.
 */
export interface KpiTrendResponse {
  kpi_code: string;
  kpi_name: string;
  category?: string;
  status: 'MATCHED' | 'NEW' | 'REMOVED';
  previous_score?: number;
  current_score?: number;
  delta?: number;
}

