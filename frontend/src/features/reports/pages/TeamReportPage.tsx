import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { useQuery } from '@tanstack/react-query';
import { organizationApi } from '@/features/organization/api/organization-api';
import { useTeamReport, useTeamKpiReport, useKpiTrend } from '../hooks/use-reports';
import { ScoreCard } from '../components/ScoreCard';
import { KpiBreakdown } from '../components/KpiBreakdown';
import { KpiTrendTable } from '../components/KpiTrendTable';
import { DataAsOf } from '../components/DataAsOf';
import { CycleSelector } from '../components/CycleSelector';
import { PageHeader, LoadingSpinner, ErrorAlert as ErrorDisplay } from '@/shared/components/ui';
import { Users, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { TYPOGRAPHY, COLORS, RADII, SHADOWS } from '@/shared/theme';

export const TeamReportPage: React.FC = () => {
  const { teamId: paramTeamId } = useParams<{ teamId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentCycleId, setCurrentCycleId] = React.useState('');
  const [previousCycleId, setPreviousCycleId] = React.useState('');
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>(paramTeamId || user?.managedTeamIds?.[0] || '');

  // Fetch available teams so managers and HR/Admins can switch teams
  const { data: teams = [], isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams-list-for-report'],
    queryFn: () => organizationApi.getTeams({ active: true }),
  });

  // Auto-select team when teams are loaded if no team is selected yet
  React.useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      const defaultTeam = (user?.managedTeamIds && user.managedTeamIds.length > 0)
        ? teams.find(t => user.managedTeamIds?.includes(t.id)) || teams[0]
        : teams[0];
      if (defaultTeam) {
        setSelectedTeamId(defaultTeam.id);
      }
    }
  }, [selectedTeamId, teams, user]);

  // Sync state if URL param changes
  React.useEffect(() => {
    if (paramTeamId && paramTeamId !== selectedTeamId) {
      setSelectedTeamId(paramTeamId);
    }
  }, [paramTeamId, selectedTeamId]);

  const handleTeamChange = (newTeamId: string) => {
    setSelectedTeamId(newTeamId);
    navigate(`/admin/team-report/${newTeamId}`, { replace: true });
  };

  const { data: teamReport, isLoading: isTeamLoading, isError: isTeamError, error: teamError, refetch: refetchTeam } = useTeamReport(selectedTeamId, currentCycleId);
  const { data: kpiReport, isLoading: isKpiLoading } = useTeamKpiReport(selectedTeamId, currentCycleId);
  const { data: trendReport, isLoading: isTrendLoading } = useKpiTrend(currentCycleId, previousCycleId, selectedTeamId);

  const aggregate = teamReport?.aggregate;
  const detailedKpis = kpiReport?.data || teamReport?.kpis || [];
  const trends = trendReport?.data || [];

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <PageHeader 
          title="Team Dashboard" 
          description="View aggregated evaluation scores, KPI progress, and compliance metrics for your team."
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.medium, color: COLORS.neutral[700] }}>
                Team
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => handleTeamChange(e.target.value)}
                disabled={isTeamsLoading}
                style={{
                  padding: '8px 12px',
                  borderRadius: RADII.md,
                  border: `1px solid ${COLORS.neutral[300]}`,
                  backgroundColor: COLORS.neutral.white,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  color: selectedTeamId ? COLORS.neutral[900] : COLORS.neutral[500],
                  outline: 'none',
                  minWidth: '200px',
                  cursor: 'pointer'
                }}
              >
                {!selectedTeamId && <option value="" disabled>Select a team...</option>}
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <CycleSelector 
              label="Compare with (Previous Cycle)" 
              value={previousCycleId} 
              onChange={setPreviousCycleId} 
            />
            <CycleSelector 
              label="Current Cycle" 
              value={currentCycleId} 
              onChange={setCurrentCycleId} 
            />
          </div>
          {teamReport?.dataAsOf && <DataAsOf timestamp={teamReport.dataAsOf} />}
        </div>
      </div>

      {!selectedTeamId || !currentCycleId ? (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII.xl,
          boxShadow: SHADOWS.sm,
          border: `1px solid ${COLORS.neutral[200]}`,
          color: COLORS.neutral.textSecondary,
        }}>
          Please select a team and evaluation cycle from the filters above.
        </div>
      ) : isTeamLoading || isKpiLoading || isTrendLoading ? (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner label="Loading team dashboard..." />
        </div>
      ) : isTeamError ? (
        <div style={{ padding: '20px' }}>
          <ErrorDisplay 
            error={teamError instanceof Error ? teamError : new Error("You don't have permission to view this report or data is unavailable.")} 
            onRetry={refetchTeam}
          />
        </div>
      ) : !aggregate ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII.xl,
          boxShadow: SHADOWS.sm,
          border: `1px solid ${COLORS.neutral[200]}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertCircle size={36} color={COLORS.neutral[400]} />
          <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, color: COLORS.neutral.textPrimary }}>
            No Team Evaluation Data
          </h3>
          <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
            No evaluation data found for this team in the selected cycle.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <ScoreCard 
              title="Team Average Score" 
              score={aggregate.teamAverageScore !== undefined && aggregate.teamAverageScore !== null ? Number(aggregate.teamAverageScore).toFixed(2) : '-'} 
              subtitle="Out of 100 points"
              icon={<TrendingUp size={24} />}
              theme="primary"
            />
            <ScoreCard 
              title="Completion Rate" 
              score={`${aggregate.completionRate !== undefined && aggregate.completionRate !== null ? Number(aggregate.completionRate).toFixed(1) : 0}%`} 
              subtitle={`${aggregate.completedEmployeeCount ?? 0} / ${aggregate.employeeCount ?? 0} Employees Completed`}
              icon={<CheckCircle size={24} />}
              theme={aggregate.completionRate === 100 ? 'success' : 'warning'}
            />
            <ScoreCard 
              title="Total Team Members" 
              score={aggregate.employeeCount ?? 0} 
              icon={<Users size={24} />}
              theme="info"
            />
          </div>

          <KpiBreakdown kpis={detailedKpis} title="Team KPI Averages" />
          
          <KpiTrendTable trends={trends} />
        </>
      )}
    </div>
  );
};
