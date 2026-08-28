import { z } from 'zod';

export const AuditActionSchema = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'ADJUST',
  'TEAM_CREATED',
  'TEAM_UPDATED',
  'TEAM_DEACTIVATED',
  'EXPORT'
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditEntityTypeSchema = z.enum([
  'EMPLOYEE',
  'DEPARTMENT',
  'TEAM',
  'ROLE',
  'JOB_LEVEL',
  'EVALUATION_TEMPLATE',
  'EVALUATION_CYCLE',
  'EVALUATION',
  'EVALUATION_ITEM',
  'KPI',
  'KPI_VERSION',
  'KPI_RELATIONSHIP',
  'TEMPLATE_KPI',
  'EVALUATION_KPI'
]);

export type AuditEntityType = z.infer<typeof AuditEntityTypeSchema> | string; // Allowing string fallback for flexibility if needed, but primarily typed.

export interface AuditRecordParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction | string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  performedBy: string | null;
  source?: string;
}

export const AuditRecordParamsSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  action: z.string().min(1),
  fieldName: z.string().nullable().optional(),
  oldValue: z.string().nullable().optional(),
  newValue: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  performedBy: z.string().uuid().nullable(),
  source: z.string().default('API')
});

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  action: z.string().optional(),
  performedBy: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export interface AuditLog {
  auditLogId: string;
  entityType: string;
  entityId: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  performedBy: string | null;
  performedByName: string | null;
  performedAt: string;
  source: string;
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
}

