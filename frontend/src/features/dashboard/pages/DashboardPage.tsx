import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { DashboardErrorState } from '../components/DashboardErrorState';
import { EmployeeDashboardView } from '../components/EmployeeDashboardView';
import { ManagerDashboardView } from '../components/ManagerDashboardView';
import { HrDashboardView } from '../components/HrDashboardView';
import { SystemAdminDashboardView } from '../components/SystemAdminDashboardView';
import type {
  EmployeeDashboardData,
  ManagerDashboardData,
  HrDashboardData,
  SystemAdminDashboardData,
} from '../types/dashboard.types';

export const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const cycleId = searchParams.get('cycleId') || undefined;

  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard(cycleId);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return <DashboardErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', paddingBottom: '32px' }}>
      <DashboardHeader
        role={data.role}
        cycle={data.cycle}
        lastUpdated={data.last_updated_at}
        isRefreshing={isRefetching}
        onRefresh={() => refetch()}
      />

      {data.role === 'EMPLOYEE' && <EmployeeDashboardView data={data as EmployeeDashboardData} />}
      {data.role === 'MANAGER' && <ManagerDashboardView data={data as ManagerDashboardData} />}
      {data.role === 'HR_ADMIN' && <HrDashboardView data={data as HrDashboardData} />}
      {data.role === 'SYSTEM_ADMIN' && <SystemAdminDashboardView data={data as SystemAdminDashboardData} />}
    </div>
  );
};
