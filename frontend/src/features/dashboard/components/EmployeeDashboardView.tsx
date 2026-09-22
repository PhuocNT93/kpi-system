import React from 'react';
import { Award, FileText, CheckCircle2, Clock } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { ScoreTrendChart } from './ScoreTrendChart';
import { ReviewDueWidget } from './ReviewDueWidget';
import { ScoreBreakdownWidget } from './ScoreBreakdownWidget';
import { AttentionRequiredList } from './AttentionRequiredList';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';
import type { EmployeeDashboardData } from '../types/dashboard.types';

export interface EmployeeDashboardViewProps {
  data: EmployeeDashboardData;
}

export const EmployeeDashboardView: React.FC<EmployeeDashboardViewProps> = ({ data }) => {
  const { summary, details, attention } = data;
  const { t } = useDashboardTranslation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Attention / Action Required */}
      <AttentionRequiredList items={attention} />

      {/* KPI Summary Cards */}
      <div className="dashboard-grid-4">
        <SummaryCard
          title={t('current_cycle_status', 'Current Cycle Status')}
          value={summary.current_evaluation_status ? summary.current_evaluation_status.replace(/_/g, ' ') : 'N/A'}
          subtitle={t('cycle_progress', 'Evaluation progression state')}
          icon={<FileText size={20} />}
          variant="info"
        />

        <SummaryCard
          title={t('overall_mean_score', 'Current Overall Score')}
          value={summary.current_overall_score != null ? summary.current_overall_score.toFixed(2) : 'N/A'}
          unit="/ 5.0"
          subtitle={t('overall_mean_score', 'Latest assessment score')}
          icon={<Award size={20} />}
          variant="default"
        />

        <SummaryCard
          title={t('last_cycle_score', 'Last Published Score')}
          value={summary.last_published_score != null ? summary.last_published_score.toFixed(2) : 'N/A'}
          unit="/ 5.0"
          subtitle={t('last_cycle_score', 'From previous finalized cycle')}
          icon={<CheckCircle2 size={20} />}
          variant="success"
        />

        <SummaryCard
          title={t('review_cadence_summary', 'Review Due Status')}
          value={summary.review_status ? summary.review_status.replace(/_/g, ' ') : 'N/A'}
          subtitle={summary.days_until_due !== null ? `${Math.abs(summary.days_until_due)} ${summary.days_until_due < 0 ? t('cadence_overdue', 'days overdue') : t('not_due', 'days remaining')}` : t('review_schedule', 'Cadence schedule')}
          icon={<Clock size={20} />}
          variant={summary.review_status === 'OVERDUE' ? 'danger' : summary.review_status === 'UPCOMING' ? 'warning' : 'success'}
        />
      </div>

      {/* Two Column Layout: Historical Score Trend & Review Cadence */}
      <div className="dashboard-grid-2">
        <ScoreTrendChart data={details.score_trend} />
        <ReviewDueWidget
          status={details.review_schedule.status}
          nextReviewDueDate={details.review_schedule.next_review_due_date}
          daysUntilDue={details.review_schedule.days_until_due}
          reviewCadence={details.review_schedule.review_cadence}
          lastEvaluationCompletedAt={details.review_schedule.last_evaluation_completed_at}
        />
      </div>

      {/* Criteria Breakdown & Strengths / Development Areas */}
      <ScoreBreakdownWidget
        breakdown={details.score_breakdown}
        strengths={details.strengths}
        developmentAreas={details.development_areas}
      />
    </div>
  );
};
