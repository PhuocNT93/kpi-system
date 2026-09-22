import React from 'react';
import { Users, CheckCircle2, TrendingUp, AlertCircle, BarChart2, Clock } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { ScoreDistributionChart } from './ScoreDistributionChart';
import { WorkflowStatusChart } from './WorkflowStatusChart';
import { AttentionRequiredList } from './AttentionRequiredList';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';
import type { ManagerDashboardData } from '../types/dashboard.types';

export interface ManagerDashboardViewProps {
  data: ManagerDashboardData;
}

export const ManagerDashboardView: React.FC<ManagerDashboardViewProps> = ({ data }) => {
  const { summary, details, attention } = data;
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Attention Required Items */}
      <AttentionRequiredList items={attention} />

      {/* Summary KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '16px',
        }}
      >
        <SummaryCard
          title={t('team_members', 'Team Members')}
          value={summary.team_members_count}
          subtitle={t('members_across_teams', 'Active members in managed teams')}
          icon={<Users size={20} />}
          variant="default"
        />

        <SummaryCard
          title={t('total_evaluations', 'Total Evaluations')}
          value={summary.total_evaluations}
          subtitle={`${summary.completed_evaluations} ${t('completed_evaluations', 'completed')}, ${summary.in_progress_evaluations} ${t('in_progress', 'in progress')}`}
          icon={<BarChart2 size={20} />}
          variant="info"
        />

        <SummaryCard
          title={t('completion_rate', 'Completion Rate')}
          value={summary.completion_rate}
          unit="%"
          subtitle={t('team_cycle_progress', 'Team cycle completion progress')}
          icon={<CheckCircle2 size={20} />}
          variant={summary.completion_rate >= 80 ? 'success' : summary.completion_rate >= 50 ? 'warning' : 'default'}
        />

        <SummaryCard
          title={t('team_average', 'Team Average Score')}
          value={summary.team_average_score != null ? summary.team_average_score.toFixed(2) : 'N/A'}
          unit="/ 5.0"
          subtitle={t('overall_mean_score', 'Aggregate team evaluation score')}
          icon={<TrendingUp size={20} />}
          variant="default"
        />

        <SummaryCard
          title={t('overdue_reviews', 'Overdue Reviews')}
          value={summary.overdue_reviews_count}
          subtitle={t('overdue_reviews', 'Members exceeding cadence')}
          icon={<AlertCircle size={20} />}
          variant={summary.overdue_reviews_count > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Two Column Layout: Workflow Distribution & Score Distribution */}
      <div className="dashboard-grid-2">
        <WorkflowStatusChart
          title={t('team_workflow_distribution', 'Team Workflow Distribution')}
          data={details.workflow_distribution}
        />
        <ScoreDistributionChart
          title={t('team_score_distribution', 'Team Score Distribution')}
          subtitle={t('team_distribution_anonymous_note', 'Histogram of evaluation scores across team (strictly anonymous aggregate)')}
          data={details.score_distribution}
        />
      </div>

      {/* Review Due Summary & Criterion Aggregates */}
      <div className="dashboard-grid-2">
        {/* Team Review Cadence Status */}
        <div
          role="region"
          aria-label="Team Review Cadence Summary"
          style={{
            padding: 'clamp(16px, 2.5vw, 24px)',
            borderRadius: RADII.xl,
            backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
            border: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
            boxShadow: SHADOWS.sm,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={18} color={COLORS.primary.DEFAULT} />
            <h3
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 700,
                color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
                fontFamily: TYPOGRAPHY.fontFamily.headline,
              }}
            >
              {t('review_cadence_summary', 'Team Review Cadence Overview')}
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px' }}>
            <div
              style={{
                padding: '14px',
                borderRadius: RADII.lg,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                border: `1px solid ${isDark ? 'transparent' : '#FECACA'}`,
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#EF4444' }}>{t('cadence_overdue', 'Overdue')}</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#EF4444', marginTop: '4px' }}>
                {details.review_due_summary.overdue_count}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: RADII.lg,
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
                border: `1px solid ${isDark ? 'transparent' : '#FDE68A'}`,
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F59E0B' }}>{t('cadence_upcoming', 'Upcoming')}</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F59E0B', marginTop: '4px' }}>
                {details.review_due_summary.upcoming_count}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: RADII.lg,
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                border: `1px solid ${isDark ? 'transparent' : '#A7F3D0'}`,
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10B981' }}>{t('not_due', 'On Schedule')}</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>
                {details.review_due_summary.not_due_count}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: RADII.lg,
                backgroundColor: isDark ? 'rgba(107, 114, 128, 0.15)' : '#F3F4F6',
                border: `1px solid ${isDark ? 'transparent' : '#E5E7EB'}`,
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>{t('no_schedule', 'No Schedule')}</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6B7280', marginTop: '4px' }}>
                {details.review_due_summary.no_schedule_count}
              </div>
            </div>
          </div>
        </div>

        {/* Criterion Average Scores */}
        <div
          role="region"
          aria-label="Team Criterion Aggregates"
          style={{
            padding: '24px',
            borderRadius: RADII.xl,
            backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
            border: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
            boxShadow: SHADOWS.sm,
          }}
        >
          <h3
            style={{
              margin: '0 0 16px 0',
              fontSize: '1rem',
              fontWeight: 700,
              color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
              fontFamily: TYPOGRAPHY.fontFamily.headline,
            }}
          >
            {t('score_breakdown', 'Criterion Averages')}
          </h3>

          {details.criterion_aggregates.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
              {t('no_strengths_data', 'No criteria scores aggregated for the current team cycle.')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {details.criterion_aggregates.map((crit) => (
                <div
                  key={crit.criterion_code}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    backgroundColor: isDark ? '#111827' : COLORS.neutral[50],
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                      {crit.criterion_name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary, marginLeft: '6px' }}>
                      ({crit.category})
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: COLORS.primary.DEFAULT,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {crit.average_score.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
