import React from 'react';
import { Users, CheckCircle2, TrendingUp, AlertCircle, BarChart2, Building2 } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { ScoreDistributionChart } from './ScoreDistributionChart';
import { WorkflowStatusChart } from './WorkflowStatusChart';
import { AttentionRequiredList } from './AttentionRequiredList';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';
import type { HrDashboardData } from '../types/dashboard.types';

export interface HrDashboardViewProps {
  data: HrDashboardData;
}

export const HrDashboardView: React.FC<HrDashboardViewProps> = ({ data }) => {
  const { summary, details, attention } = data;
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Attention / Alerts */}
      <AttentionRequiredList items={attention} />

      {/* Organization Summary Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '16px',
        }}
      >
        <SummaryCard
          title={t('total_employees', 'Total Employees')}
          value={summary.total_employees}
          subtitle={`${summary.active_employees} ${t('active_employees', 'active employees')}`}
          icon={<Users size={20} />}
          variant="default"
        />

        <SummaryCard
          title={t('total_evaluations', 'Total Evaluations')}
          value={summary.total_evaluations}
          subtitle={`${summary.completed_evaluations} ${t('completed_evaluations', 'completed')}, ${summary.published_evaluations} ${t('published_evaluations', 'published')}`}
          icon={<BarChart2 size={20} />}
          variant="info"
        />

        <SummaryCard
          title={t('completion_rate', 'Completion Rate')}
          value={summary.completion_rate}
          unit="%"
          subtitle={t('org_cycle_progress', 'Organization cycle progress')}
          icon={<CheckCircle2 size={20} />}
          variant={summary.completion_rate >= 80 ? 'success' : summary.completion_rate >= 50 ? 'warning' : 'default'}
        />

        <SummaryCard
          title={t('organization_average', 'Organization Average')}
          value={summary.organization_average_score != null ? summary.organization_average_score.toFixed(2) : 'N/A'}
          unit="/ 5.0"
          subtitle={t('overall_mean_score', 'Overall mean evaluation score')}
          icon={<TrendingUp size={20} />}
          variant="default"
        />

        <SummaryCard
          title={t('overdue_reviews', 'Overdue Reviews')}
          value={summary.overdue_reviews_count}
          subtitle={t('employees_across_departments', 'Employees across departments')}
          icon={<AlertCircle size={20} />}
          variant={summary.overdue_reviews_count > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Two Column Layout: Workflow Bottlenecks & Score Distribution */}
      <div className="dashboard-grid-2">
        <WorkflowStatusChart
          title={t('org_workflow_distribution', 'Organization Workflow Distribution')}
          data={details.workflow_distribution}
        />
        <ScoreDistributionChart
          title={t('org_score_distribution', 'Organization Score Distribution')}
          subtitle={t('distribution_anonymous_note', 'Distribution of evaluation scores across all teams (strictly anonymous aggregate)')}
          data={details.score_distribution}
        />
      </div>

      {/* Department & Team Aggregates Table */}
      <div
        role="region"
        aria-label="Department and Team Aggregates"
        style={{
          padding: 'clamp(16px, 2.5vw, 24px)',
          borderRadius: RADII.xl,
          backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
          border: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
          boxShadow: SHADOWS.sm,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Building2 size={18} color={COLORS.primary.DEFAULT} />
          <h3
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
              fontFamily: TYPOGRAPHY.fontFamily.headline,
            }}
          >
            {t('dept_team_overview', 'Department & Team Performance Overview')}
          </h3>
        </div>

        {details.department_team_aggregates.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
            {t('empty_dashboard_desc', 'No team performance aggregates recorded for this evaluation cycle.')}
          </p>
        ) : (
          <div className="table-responsive-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}` }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>{t('team_col', 'Team')}</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>{t('dept_col', 'Department')}</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary, textAlign: 'right' }}>{t('members_col', 'Members')}</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary, textAlign: 'right' }}>{t('completed_col', 'Completed')}</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary, textAlign: 'right' }}>{t('completion_rate_col', 'Completion Rate')}</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary, textAlign: 'right' }}>{t('avg_score_col', 'Average Score')}</th>
                </tr>
              </thead>
              <tbody>
                {details.department_team_aggregates.map((team) => (
                  <tr
                    key={team.team_id}
                    style={{ borderBottom: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : COLORS.neutral[100]}` }}
                  >
                    <td style={{ padding: '12px', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                      {team.team_name}
                    </td>
                    <td style={{ padding: '12px', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
                      {team.department_name}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: isDark ? '#D1D5DB' : COLORS.neutral.textPrimary }}>
                      {team.employee_count}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: isDark ? '#D1D5DB' : COLORS.neutral.textPrimary }}>
                      {team.completed_count}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                      {team.completion_rate}%
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: COLORS.primary.DEFAULT }}>
                      {team.average_score != null ? team.average_score.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
