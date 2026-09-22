import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';
import { useAuth } from '../../../shared/auth/auth-context';
import type { RoleDashboardData } from '../types/dashboard.types';

export function useDashboard(cycleId?: string) {
  const { user, isAuthenticated } = useAuth();

  return useQuery<RoleDashboardData, Error>({
    queryKey: ['dashboard', user?.role, user?.employeeId || user?.id, cycleId || 'default'],
    queryFn: () => dashboardApi.getDashboard(cycleId),
    enabled: Boolean(isAuthenticated),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}
