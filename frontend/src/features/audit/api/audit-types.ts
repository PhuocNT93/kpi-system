export interface WireAuditLog {
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

export interface WirePaginatedAuditLogs {
  logs: WireAuditLog[];
  total: number;
}
