import { z } from 'zod';

export const AuditActionSchema = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'REVIEW',
  'REQUEST_CORRECTION',
  'SUBMIT',
  'PUBLISH',
  'LOCK',
  'ADJUST',
  'TEAM_CREATED',
  'TEAM_UPDATED',
  'TEAM_DEACTIVATED',
  'EXPORT',
  'IMPORT_APPLY',
  'CALIBRATION_SESSION_CREATE',
  'CALIBRATION_ADJUST',
  'CALIBRATION_FINALIZE',
  'FINALIZE',
  'INDIVIDUAL_CYCLE_CREATED',
  'SCHEDULE_UPDATED',
  'SCHEDULE_RECALC',
  'CRAWL_SCRIPT_CREATED',
  'CRAWL_SCRIPT_PUBLISHED',
  'CRAWL_JOB_CREATED',
  'CRAWL_JOB_UPDATED',
  'CRAWL_JOB_ENABLED',
  'CRAWL_JOB_DISABLED',
  'CRAWL_EXECUTION_QUEUED',
  'CRAWL_EXECUTION_STARTED',
  'CRAWL_EXECUTION_SKIPPED',
  'CRAWL_EXECUTION_SUCCEEDED',
  'CRAWL_EXECUTION_PARTIAL_SUCCESS',
  'CRAWL_EXECUTION_FAILED',
  'CRAWL_EXECUTION_RETRIED',
  'CRAWL_EXECUTION_CANCELLED',
  'CRAWL_CREDENTIAL_CREATED',
  'CRAWL_REVIEWED',
  'CRAWL_APPLIED',
  'CRAWL_REJECTED'
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditEntityTypeSchema = z.enum([
  'EMPLOYEE',
  'DEPARTMENT',
  'TEAM',
  'ROLE',
  'JOB_LEVEL',
  'REVIEW_CADENCE',
  'EVALUATION_TEMPLATE',
  'EVALUATION_CYCLE',
  'EVALUATION',
  'EVALUATION_ITEM',
  'KPI',
  'KPI_VERSION',
  'KPI_RELATIONSHIP',
  'TEMPLATE_KPI',
  'EVALUATION_KPI',
  'CRITERION',
  'CRITERION_VERSION',
  'CALIBRATION_SESSION',
  'CALIBRATION_ADJUSTMENT',
  'CRAWL_JOB',
  'CRAWL_EXECUTION',
  'CRAWL_SCRIPT_VERSION',
  'CONNECTOR_CREDENTIAL'
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
  performedBy?: string | null;
  source?: string;
}

const uuidSchema = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  'Invalid UUID'
);

export const AuditRecordParamsSchema = z.object({
  entityType: z.string().min(1),
  entityId: uuidSchema,
  action: z.string().min(1),
  fieldName: z.string().nullable().optional(),
  oldValue: z.string().nullable().optional(),
  newValue: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  performedBy: uuidSchema.nullable().optional(),
  source: z.string().default('API')
});

export const BUSINESS_AUDIT_ENTITY_TYPES = [
  'EMPLOYEE',
  'DEPARTMENT',
  'TEAM',
  'JOB_LEVEL',
  'REVIEW_CADENCE',
  'EVALUATION_TEMPLATE',
  'EVALUATION_CYCLE',
  'EVALUATION',
  'EVALUATION_ITEM',
  'KPI',
  'KPI_VERSION',
  'KPI_RELATIONSHIP',
  'TEMPLATE_KPI',
  'EVALUATION_KPI',
  'CRITERION',
  'CRITERION_VERSION',
  'CALIBRATION_SESSION',
  'CALIBRATION_ADJUSTMENT',
  'CRAWL_JOB',
  'CRAWL_EXECUTION',
  'CRAWL_SCRIPT_VERSION',
  'CONNECTOR_CREDENTIAL'
] as const;

export type BusinessAuditEntityType = (typeof BUSINESS_AUDIT_ENTITY_TYPES)[number];

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  entityType: z.string().optional(),
  entityId: uuidSchema.optional(),
  action: z.string().optional(),
  performedBy: uuidSchema.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema> & {
  allowedEntityTypes?: string[];
};

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

