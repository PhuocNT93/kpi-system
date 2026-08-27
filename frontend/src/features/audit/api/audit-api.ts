import { getApi } from '../../../shared/api/api-client';
import type { WirePaginatedAuditLogs } from './audit-types';

export const auditApi = {
  getLogs: async (filters: Record<string, any>): Promise<WirePaginatedAuditLogs> => {
    // filter out undefined or empty string values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v != null && v !== '')
    );
    const params = new URLSearchParams(cleanFilters as Record<string, string>).toString();
    const qs = params ? `?${params}` : '';
    return getApi<WirePaginatedAuditLogs>(`/api/audit-logs${qs}`);
  }
};
