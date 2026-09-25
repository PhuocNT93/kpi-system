import { useTheme } from '../../../shared/theme';
import { useEmployee } from '../hooks/useEmployees';
import { useReviewCadences } from '../hooks/useReviewCadences';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';
import { useCanManageReviewCadence } from '../hooks/useCanManageReviewCadence';
import type { OrgEmployee } from '../domain/organization-models';
import {
  EMPTY_SCHEDULE_VALUE,
  formatCadenceLabel,
  formatTimestampDatePart,
  getCadenceSourceLabel,
} from '../domain/review-schedule-display';

interface ReviewCadenceOverrideSelectProps {
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}

/** HR/Admin-only select for the employee cadence override. Options come from the API. */
export function ReviewCadenceOverrideSelect({ value, onChange, isDisabled }: ReviewCadenceOverrideSelectProps) {
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const canManage = useCanManageReviewCadence();
  const { data: cadences } = useReviewCadences({ active: true });

  if (!canManage) return null;

  return (
    <div>
      <label htmlFor="emp-cadence-override" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.875rem' }}>
        {t('review_cadence_override', 'Review Cadence Override')}
      </label>
      <select
        id="emp-cadence-override"
        value={value}
        disabled={isDisabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: 'block',
          width: '100%',
          padding: '0.5rem',
          border: `1px solid ${isDark ? '#475569' : '#d1d5db'}`,
          borderRadius: '4px',
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          color: isDark ? '#f8fafc' : '#111827',
        }}
      >
        <option value="">{t('no_cadence_override', 'No override (use job level / system default)')}</option>
        {cadences?.map((cadence) => (
          <option key={cadence.id} value={cadence.id}>
            {formatCadenceLabel(cadence.name, cadence.intervalMonths, t)}
          </option>
        ))}
      </select>
    </div>
  );
}

interface EmployeeReviewSchedulePanelProps {
  employee: OrgEmployee;
  overrideValue?: string;
  onOverrideChange?: (value: string) => void;
  isOverrideDisabled?: boolean;
}

/**
 * Read-only view of the server-computed review schedule. The frontend never computes a due date:
 * values are rendered exactly as returned by GET /api/employees/:id (refetched after mutations).
 */
export function EmployeeReviewSchedulePanel({
  employee,
  overrideValue,
  onOverrideChange,
  isOverrideDisabled,
}: EmployeeReviewSchedulePanelProps) {
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const employeeQuery = useEmployee(employee.id);
  const current = employeeQuery.data ?? employee;
  const cadence = current.effectiveCadence;

  const labelStyle = { fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280' };
  const valueStyle = { fontSize: '0.875rem', fontWeight: 500, color: isDark ? '#f8fafc' : '#111827' };

  return (
    <section
      aria-labelledby="employee-review-schedule-title"
      data-testid="employee-review-schedule-panel"
      style={{
        gridColumn: 'span 2',
        padding: '0.75rem',
        borderRadius: 6,
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <h3 id="employee-review-schedule-title" style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
        {t('review_schedule_title', 'Review Schedule')}
      </h3>

      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', margin: 0 }}>
        <div>
          <dt style={labelStyle}>{t('effective_review_cadence', 'Effective Review Cadence')}</dt>
          <dd style={{ ...valueStyle, margin: 0 }} data-testid="effective-cadence-value">
            {cadence
              ? formatCadenceLabel(cadence.name, cadence.intervalMonths, t)
              : EMPTY_SCHEDULE_VALUE}
          </dd>
        </div>
        <div>
          <dt style={labelStyle}>{t('cadence_source', 'Cadence Source')}</dt>
          <dd style={{ ...valueStyle, margin: 0 }} data-testid="cadence-source-value">
            {cadence ? getCadenceSourceLabel(cadence.source, t) : EMPTY_SCHEDULE_VALUE}
          </dd>
        </div>
        <div>
          <dt style={labelStyle}>{t('last_evaluation_completed', 'Last Evaluation Completed')}</dt>
          <dd style={{ ...valueStyle, margin: 0 }} data-testid="last-evaluation-completed-value">
            {formatTimestampDatePart(current.lastEvaluationCompletedAt)}
          </dd>
        </div>
        <div>
          <dt style={labelStyle}>{t('next_review_due_date', 'Next Review Due Date')}</dt>
          <dd style={{ ...valueStyle, margin: 0 }} data-testid="next-review-due-date-value">
            {current.nextReviewDueDate ?? EMPTY_SCHEDULE_VALUE}
          </dd>
        </div>
      </dl>

      {!current.nextReviewDueDate && (
        <p style={{ margin: 0, fontSize: '0.75rem', color: isDark ? '#fbbf24' : '#b45309' }}>
          {t('review_due_now_hint', 'No completed evaluation yet — review is due now.')}
        </p>
      )}

      {onOverrideChange && (
        <ReviewCadenceOverrideSelect
          value={overrideValue ?? ''}
          onChange={onOverrideChange}
          isDisabled={isOverrideDisabled}
        />
      )}
    </section>
  );
}
