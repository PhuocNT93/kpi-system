import React from 'react';
import { useParams } from 'react-router-dom';
import { useTeamReport, useTeamKpiReport, useKpiTrend } from '../hooks/use-reports';
import { ScoreCard } from '../components/ScoreCard';
import { KpiBreakdown } from '../components/KpiBreakdown';
import { KpiTrendTable } from '../components/KpiTrendTable';
import { DataAsOf } from '../components/DataAsOf';
import { PageHeader, LoadingSpinner, ErrorAlert as ErrorDisplay } from '@/shared/components/ui';
import { Users, CheckCircle, TrendingUp } from 'lucide-react';

export const TeamReportPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  // Real app: from context/selector
  const currentCycleId = 'current-cycle'; 
  const previousCycleId = 'previous-cycle';

  const { data: teamReport, isLoading: isTeamLoading, isError: isTeamError, error: teamError } = useTeamReport(teamId!, currentCycleId);
  const { data: kpiReport, isLoading: isKpiLoading } = useTeamKpiReport(teamId!, currentCycleId);
  const { data: trendReport, isLoading: isTrendLoading } = useKpiTrend(currentCycleId, previousCycleId, teamId!);

  if (isTeamLoading || isKpiLoading || isTrendLoading) {
    return <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><LoadingSpinner label="Loading..." /></div>;
  }

  if (isTeamError || !teamReport?.success) {
    return (
      <div style={{ padding: '40px' }}>
        <ErrorDisplay 
          error={new Error(teamError?.message || teamReport?.message || "You don't have permission to view this report.")} 
        />
      </div>
    );
  }

  const { aggregate, kpis } = teamReport.data;
  const detailedKpis = kpiReport?.data?.data || kpis; // Fallback to basic kpis if detailed fails
  const trends = trendReport?.data?.data || [];

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PageHeader 
          title="Team Performance Report" 
          description="View aggregate evaluation scores and KPI trends for your managed team."
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <DataAsOf timestamp={teamReport.dataAsOf} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <ScoreCard 
          title="Team Average Score" 
          score={aggregate.teamAverageScore !== undefined ? Number(aggregate.teamAverageScore).toFixed(2) : '-'} 
          subtitle="Out of 100 points"
          icon={<TrendingUp size={24} />}
          theme="primary"
        />
        <ScoreCard 
          title="Completion Rate" 
          score={`${aggregate.completionRate !== undefined ? Number(aggregate.completionRate).toFixed(1) : 0}%`} 
          subtitle={`${aggregate.completedEmployeeCount} / ${aggregate.employeeCount} Employees Completed`}
          icon={<CheckCircle size={24} />}
          theme={aggregate.completionRate === 100 ? 'success' : 'warning'}
        />
        <ScoreCard 
          title="Total Team Members" 
          score={aggregate.employeeCount} 
          icon={<Users size={24} />}
          theme="info"
        />
      </div>

      {/* Explicitly no employee ranking/leaderboard here per requirements */}

      <KpiBreakdown kpis={detailedKpis} title="Team KPI Averages" />
      
      <KpiTrendTable trends={trends} />
    </div>
  );
};
