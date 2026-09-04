import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { auditApi } from '../api/audit-api';
import { auditKeys } from '../api/audit-keys';
import type { WirePaginatedAuditLogs } from '../api/audit-types';

export function useAuditLogs(filters: Record<string, unknown>) {
  return useQuery<WirePaginatedAuditLogs>({
    queryKey: auditKeys.list(filters),
    queryFn: () => auditApi.getLogs(filters),
    placeholderData: keepPreviousData,
  });
}
