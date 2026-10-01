import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/auth/auth-context';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { PageHeader, LoadingSpinner, ErrorAlert as ErrorDisplay } from '@/shared/components/ui';
import { Users, CheckCircle, TrendingUp, UsersRound, CalendarSearch, Target } from 'lucide-react';
import { SubTabs } from '@/shared/ui/SubTabs/SubTabs';
import { organizationApi } from '@/features/organization/api/organization-api';
import { useTeamReport, useTeamKpiReport, useKpiTrend } from '../hooks/use-reports';
import { useReportPalette } from '../hooks/use-report-palette';
import { ScoreCard } from '../components/ScoreCard';
import { KpiBreakdown } from '../components/KpiBreakdown';
import { KpiTrendTable } from '../components/KpiTrendTable';
import { CycleSelector } from '../components/CycleSelector';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { ReportEmptyState } from '../components/ReportEmptyState';
import { reportPageStyle } from './report-page-layout';

interface TeamReportPageProps {
  isEmbedded?: boolean;
}

type TeamTableView = 'averages' | 'trend';

export const TeamReportPage: React.FC<TeamReportPageProps> = ({ isEmbedded = false }) => {
  const { teamId: paramTeamId } = useParams<{ teamId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useUiTranslation();
  const palette = useReportPalette();

  const [currentCycleId, setCurrentCycleId] = React.useState('');
  const [previousCycleId, setPreviousCycleId] = React.useState('');
  // In the hub the two tables share the remaining height, one at a time.
  const [tableView, setTableView] = React.useState<TeamTableView>('averages');
  const [fallbackTeamId, setFallbackTeamId] = React.useState<string>(user?.managedTeamIds?.[0] || '');

  // In the hub the team lives in `?team=` so switching teams never leaves the hub.
  const urlTeamId = isEmbedded ? searchParams.get('team') || '' : paramTeamId || '';
  const selectedTeamId = urlTeamId || fallbackTeamId;

  const { data: teams = [], isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams-list-for-report'],
    queryFn: () => organizationApi.getTeams({ active: true }),
  });

  React.useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      const managed = user?.managedTeamIds ?? [];
      const defaultTeam = teams.find((team) => managed.includes(team.id)) || teams[0];
      setFallbackTeamId(defaultTeam.id);
    }
  }, [selectedTeamId, teams, user]);

  const handleTeamChange = (newTeamId: string) => {
    if (isEmbedded) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('team', newTeamId);
          return next;
        },
        { replace: true }
      );
      return;
    }
    setFallbackTeamId(newTeamId);
    navigate(`/admin/team-report/${newTeamId}`, { replace: true });
  };

  const { data: teamReport, isLoading: isTeamLoading, isError: isTeamError, error: teamError, refetch: refetchTeam } = useTeamReport(selectedTeamId, currentCycleId);
  const { data: kpiReport, isLoading: isKpiLoading } = useTeamKpiReport(selectedTeamId, currentCycleId);
  const { data: trendReport, isLoading: isTrendLoading } = useKpiTrend(currentCycleId, previousCycleId, selectedTeamId);

  const aggregate = teamReport?.aggregate;
  const detailedKpis = kpiReport?.data || teamReport?.kpis || [];
  const trends = trendReport?.data || [];
  const noScoreHint = t('reports.common.no_score_hint', 'Scores appear once evaluations are completed.');
  const averageScore =
    aggregate?.teamAverageScore !== undefined && aggregate?.teamAverageScore !== null
      ? Number(aggregate.teamAverageScore).toFixed(2)
      : null;

  return (
    <div style={reportPageStyle(isEmbedded)}>
      {!isEmbedded && (
        <PageHeader
          title={t('reports.team.title', 'Team Dashboard')}
          description={t('reports.team.description', 'View aggregated evaluation scores, KPI progress, and compliance metrics for your team.')}
        />
      )}

      <ReportFilterBar title={t('reports.common.filters', 'Report Filters')} dataAsOf={teamReport?.dataAsOf}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 200px', minWidth: 0 }}>
          <label htmlFor="team-report-team" style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: palette.textSecondary }}>
            {t('reports.team.team_label', 'Team')}
          </label>
          <select
            id="team-report-team"
            value={selectedTeamId}
            onChange={(e) => handleTeamChange(e.target.value)}
            disabled={isTeamsLoading}
            style={{
              height: '38px',
              boxSizing: 'border-box',
              padding: '0 12px',
              borderRadius: RADII.md,
              border: `1px solid ${palette.inputBorder}`,
              backgroundColor: palette.inputBg,
              fontSize: TYPOGRAPHY.fontSize.sm,
              color: palette.textPrimary,
              outline: 'none',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            {!selectedTeamId && (
              <option value="" disabled>
                {t('reports.team.select_team', 'Select a team...')}
              </option>
            )}
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <CycleSelector
          id="team-report-current-cycle"
          label={t('reports.team.current_cycle', 'Current Cycle')}
          value={currentCycleId}
          onChange={setCurrentCycleId}
        />
        <CycleSelector
          id="team-report-previous-cycle"
          label={t('reports.team.compare_cycle', 'Compare with (Previous Cycle)')}
          value={previousCycleId}
          onChange={setPreviousCycleId}
          isOptional
        />
      </ReportFilterBar>

      {!selectedTeamId || !currentCycleId ? (
        <ReportEmptyState
          icon={<CalendarSearch size={26} />}
          title={t('reports.team.select_prompt', 'Please select a team and evaluation cycle from the filters above.')}
        />
      ) : isTeamLoading || isKpiLoading || isTrendLoading ? (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner label={t('reports.team.loading', 'Loading team dashboard...')} />
        </div>
      ) : isTeamError ? (
        <ErrorDisplay
          error={teamError instanceof Error ? teamError : new Error(t('reports.common.load_error', "You don't have permission to view this report or data is unavailable."))}
          onRetry={refetchTeam}
        />
      ) : !aggregate ? (
        <ReportEmptyState
          icon={<UsersRound size={26} />}
          title={t('reports.team.empty_title', 'No Team Evaluation Data')}
          description={t('reports.team.empty_desc', 'No evaluation data found for this team in the selected cycle.')}
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <ScoreCard
              title={t('reports.team.average_score', 'Team Average Score')}
              score={averageScore ?? '—'}
              subtitle={averageScore ? t('reports.common.out_of_100', 'Out of 100 points') : noScoreHint}
              icon={<TrendingUp size={24} />}
              theme="primary"
            />
            <ScoreCard
              title={t('reports.team.completion_rate', 'Completion Rate')}
              score={`${aggregate.completionRate !== undefined && aggregate.completionRate !== null ? Number(aggregate.completionRate).toFixed(1) : 0}%`}
              subtitle={t('reports.common.completed_of', '{completed} / {total} Employees Completed', {
                completed: aggregate.completedEmployeeCount ?? 0,
                total: aggregate.employeeCount ?? 0,
              })}
              icon={<CheckCircle size={24} />}
              theme={aggregate.completionRate === 100 ? 'success' : 'warning'}
            />
            <ScoreCard
              title={t('reports.team.member_count', 'Total Team Members')}
              score={aggregate.employeeCount ?? 0}
              icon={<Users size={24} />}
              theme="info"
            />
          </div>

          {isEmbedded && (
            <SubTabs<TeamTableView>
              ariaLabel={t('reports.team.kpi_title', 'Team KPI Averages')}
              value={tableView}
              onChange={setTableView}
              items={[
                { id: 'averages', label: t('reports.team.subtab.averages', 'KPI Averages'), icon: <Target size={16} /> },
                { id: 'trend', label: t('reports.team.subtab.trend', 'KPI Trend'), icon: <TrendingUp size={16} /> },
              ]}
            />
          )}

          {(!isEmbedded || tableView === 'averages') && (
            <KpiBreakdown kpis={detailedKpis} title={t('reports.team.kpi_title', 'Team KPI Averages')} isScrollable={isEmbedded} />
          )}

          {(!isEmbedded || tableView === 'trend') && (
            <KpiTrendTable
              trends={trends}
              isScrollable={isEmbedded}
              emptyTitle={
                previousCycleId
                  ? undefined
                  : t('reports.team.trend_pick_title', 'Choose a comparison cycle to see KPI trends.')
              }
              emptyDescription={
                previousCycleId
                  ? undefined
                  : t('reports.team.trend_pick_desc', 'Use "Compare with (Previous Cycle)" in the filters above.')
              }
            />
          )}
        </>
      )}
    </div>
  );
};
