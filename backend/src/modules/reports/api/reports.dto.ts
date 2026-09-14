import { z } from 'zod';

export const getReportQuerySchema = z.object({
  cycleId: z.string().uuid('Invalid cycleId format').min(1, 'cycleId is required'),
});

export type GetReportQueryDto = z.infer<typeof getReportQuerySchema>;

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
