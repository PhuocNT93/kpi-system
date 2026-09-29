import React from 'react';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { PageHeader, LoadingSpinner, ErrorAlert as ErrorDisplay } from '@/shared/components/ui';
import { Building2, CheckCircle, CalendarSearch, Building } from 'lucide-react';
import { useOrganizationReport } from '../hooks/use-reports';
import { ScoreCard } from '../components/ScoreCard';
import { CycleSelector } from '../components/CycleSelector';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { ReportEmptyState } from '../components/ReportEmptyState';
import { ScoreDistributionBars } from '../components/ScoreDistributionBars';
import { reportPageStyle } from './report-page-layout';

interface OrganizationReportPageProps {
  isEmbedded?: boolean;
}

export const OrganizationReportPage: React.FC<OrganizationReportPageProps> = ({ isEmbedded = false }) => {
  const { t } = useUiTranslation();
  const [cycleId, setCycleId] = React.useState('');

  const { data: orgReport, isLoading, isError, error, refetch } = useOrganizationReport(cycleId);
  const orgData = orgReport?.data?.[0];
  const averageScore =
    orgData?.averageScore !== undefined && orgData?.averageScore !== null ? Number(orgData.averageScore).toFixed(2) : null;

  return (
    <div style={reportPageStyle(isEmbedded)}>
      {!isEmbedded && (
        <PageHeader
          title={t('reports.org.title', 'Organization Dashboard')}
          description={t('reports.org.description', 'View organizational performance and completion metrics across all departments and teams.')}
        />
      )}

      <ReportFilterBar title={t('reports.common.filters', 'Report Filters')} dataAsOf={orgReport?.dataAsOf}>
        <CycleSelector id="org-report-cycle" label={t('reports.common.cycle', 'Evaluation Cycle')} value={cycleId} onChange={setCycleId} />
      </ReportFilterBar>

      {!cycleId ? (
        <ReportEmptyState
          icon={<CalendarSearch size={26} />}
          title={t('reports.common.select_cycle', 'Please select an evaluation cycle from the dropdown above.')}
        />
      ) : isLoading ? (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner label={t('reports.org.loading', 'Loading organization dashboard...')} />
        </div>
      ) : isError ? (
        <ErrorDisplay
          error={error instanceof Error ? error : new Error(t('reports.common.load_error', "You don't have permission to view this report or data is unavailable."))}
          onRetry={refetch}
        />
      ) : !orgData ? (
        <ReportEmptyState
          icon={<Building size={26} />}
          title={t('reports.org.empty_title', 'No Organization Data')}
          description={t('reports.org.empty_desc', 'No organizational report data found for the selected cycle.')}
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <ScoreCard
              title={t('reports.org.average_score', 'Organization Average Score')}
              score={averageScore ?? '—'}
              subtitle={
                averageScore
                  ? t('reports.common.out_of_100', 'Out of 100 points')
                  : t('reports.common.no_score_hint', 'Scores appear once evaluations are completed.')
              }
              icon={<Building2 size={24} />}
              theme="primary"
            />
            <ScoreCard
              title={t('reports.org.completion_rate', 'Overall Completion Rate')}
              score={`${orgData.completionRate !== undefined && orgData.completionRate !== null ? Number(orgData.completionRate).toFixed(1) : 0}%`}
              subtitle={t('reports.common.completed_of', '{completed} / {total} Employees Completed', {
                completed: orgData.completedEmployeeCount ?? 0,
                total: orgData.employeeCount ?? 0,
              })}
              icon={<CheckCircle size={24} />}
              theme={orgData.completionRate === 100 ? 'success' : 'warning'}
            />
          </div>

          <ScoreDistributionBars distribution={orgData.scoreDistribution} />
        </>
      )}
    </div>
  );
};
