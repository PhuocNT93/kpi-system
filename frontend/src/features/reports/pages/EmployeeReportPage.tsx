import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { PageHeader, LoadingSpinner, ErrorAlert as ErrorDisplay } from '@/shared/components/ui';
import { Award, Target, CalendarDays, Lock, ClipboardX, CalendarSearch, UserX } from 'lucide-react';
import { useEmployeeReport } from '../hooks/use-reports';
import { useReportPalette } from '../hooks/use-report-palette';
import { ScoreCard } from '../components/ScoreCard';
import { KpiBreakdown } from '../components/KpiBreakdown';
import { CycleSelector } from '../components/CycleSelector';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { ReportEmptyState } from '../components/ReportEmptyState';
import { reportPageStyle } from './report-page-layout';

interface EmployeeReportPageProps {
  isEmbedded?: boolean;
}

const formatScore = (value: number | null | undefined): string | null =>
  value !== undefined && value !== null ? Number(value).toFixed(2) : null;

export const EmployeeReportPage: React.FC<EmployeeReportPageProps> = ({ isEmbedded = false }) => {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const { user } = useAuth();
  const { t } = useUiTranslation();
  const palette = useReportPalette();
  const [cycleId, setCycleId] = React.useState('');

  // Accounts without a linked employee profile (e.g. pure admin accounts) have no personal report.
  const targetEmployeeId = employeeId && employeeId !== 'me' ? employeeId : user?.employeeId || '';
  const { data: response, isLoading, isError, error, refetch } = useEmployeeReport(targetEmployeeId, cycleId);

  const noScoreHint = t('reports.common.no_score_hint', 'Scores appear once evaluations are completed.');
  const scoreCard = (title: string, value: number | null | undefined, icon: React.ReactNode, theme: 'primary' | 'info' | 'warning', subtitle?: string) => {
    const formatted = formatScore(value);
    return <ScoreCard title={title} score={formatted ?? '—'} subtitle={formatted ? subtitle : noScoreHint} icon={icon} theme={theme} />;
  };

  return (
    <div style={reportPageStyle(isEmbedded)}>
      {!isEmbedded && (
        <PageHeader
          title={t('reports.my.title', 'Performance Report')}
          description={t('reports.my.description', 'View your evaluation scores and KPI breakdown for the selected cycle.')}
        />
      )}

      <ReportFilterBar title={t('reports.common.filters', 'Report Filters')} dataAsOf={response?.dataAsOf}>
        <CycleSelector
          id="my-report-cycle"
          label={t('reports.common.cycle', 'Evaluation Cycle')}
          value={cycleId}
          onChange={setCycleId}
        />
        {response?.score?.isLocked && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '38px',
              padding: '0 12px',
              borderRadius: RADII.md,
              background: palette.tones.warning.bg,
              color: palette.tones.warning.fg,
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: 600,
            }}
          >
            <Lock size={14} aria-hidden="true" /> {t('reports.my.locked', 'Evaluation Locked')}
          </span>
        )}
      </ReportFilterBar>

      {!targetEmployeeId ? (
        <ReportEmptyState
          icon={<UserX size={26} />}
          title={t('reports.my.no_profile_title', 'No employee profile linked')}
          description={t(
            'reports.my.no_profile_desc',
            'This account is not linked to an employee profile, so there is no personal report. Use the Team, Organization or KPI Summary tabs instead.'
          )}
        />
      ) : !cycleId ? (
        <ReportEmptyState
          icon={<CalendarSearch size={26} />}
          title={t('reports.common.select_cycle', 'Please select an evaluation cycle from the dropdown above.')}
        />
      ) : isLoading ? (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner label={t('reports.my.loading', 'Loading performance report...')} />
        </div>
      ) : isError ? (
        <ErrorDisplay
          error={error instanceof Error ? error : new Error(t('reports.common.load_error', "You don't have permission to view this report or data is unavailable."))}
          onRetry={refetch}
        />
      ) : !response || !response.score ? (
        <ReportEmptyState
          icon={<ClipboardX size={26} />}
          title={t('reports.my.empty_title', 'No Evaluation Record')}
          description={t('reports.my.empty_desc', 'There is no evaluation record found for this cycle.')}
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {scoreCard(t('reports.my.final_score', 'Final Score'), response.score.finalScore, <Award size={24} />, 'primary', t('reports.common.out_of_100', 'Out of 100 points'))}
            {scoreCard(t('reports.my.manager_score', 'Manager Score'), response.score.managerScore, <Target size={24} />, 'info')}
            {scoreCard(t('reports.my.self_score', 'Self Score'), response.score.selfScore, <CalendarDays size={24} />, 'warning')}
          </div>

          <KpiBreakdown kpis={response.kpis || []} title={t('reports.my.kpi_title', 'Your KPI Breakdown')} isScrollable={isEmbedded} />
        </>
      )}
    </div>
  );
};
