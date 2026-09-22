import { getApi } from '../../../shared/api/api-client';
import type { RoleDashboardData } from '../types/dashboard.types';

export const dashboardApi = {
  getDashboard: async (cycleId?: string): Promise<RoleDashboardData> => {
    const query = cycleId ? `?cycleId=${encodeURIComponent(cycleId)}` : '';
    return await getApi<RoleDashboardData>(`/api/reports/dashboard${query}`);
  },
};
