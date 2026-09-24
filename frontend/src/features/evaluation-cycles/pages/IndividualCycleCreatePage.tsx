import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/shared/auth/auth-context';
import { useEmployees } from '@/features/organization/hooks/useEmployees';
import { useTeams } from '@/features/organization/hooks/useTeams';
import { useTemplatesQuery } from '@/features/templates/api/use-templates';
import type { EvaluationTemplate } from '@/features/templates/domain/template-models';
import { ApiClientError } from '@/shared/api/api-client';
import { LoadingSpinner, ErrorAlert, ConfirmDialog } from '@/shared/components/ui';
import { Button } from '@/shared/ui/Button/Button';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, useTheme } from '@/shared/theme';
import { IndividualEmployeePicker } from '../components/IndividualEmployeePicker';
import { IndividualCycleResultPanel } from '../components/IndividualCycleResultPanel';
import { useCreateIndividualCyclesMutation } from '../hooks/use-evaluation-cycles';
import { useIndividualCycleTranslation, useIsMobile } from '../hooks/use-individual-cycle-ui';
import type { TranslationVars } from '../hooks/use-individual-cycle-ui';
import { EVALUATION_ALREADY_OPEN } from '../types/cycle-types';
import type { IndividualCycleCreationResult } from '../types/cycle-types';

const ACTIVE_EMPLOYMENT_STATUS = 'ACTIVE';
const DEFAULT_DURATION_DAYS = 30;

type Translate = (key: string, fallback: string, vars?: TranslationVars) => string;

interface FormErrors {
  employeeIds?: string;
  templateVersionId?: string;
  startDate?: string;
  endDate?: string;
}

interface TemplateOption {
  id: string;
  label: string;
}

function toIsoDate(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toTemplateOption(template: EvaluationTemplate): TemplateOption | null {
  const id = template.currentVersionId ?? template.currentVersion?.id;
  if (!id) return null;
  const versionNo = template.currentVersion?.versionNo ?? template.version;
  const criteriaCount = template.criteriaCount ?? template.currentVersion?.criteria?.length;
  return {
    id,
    label: `${template.name} (v${versionNo}) — ${template.status}${criteriaCount ? ` (${criteriaCount})` : ''}`,
  };
}

/** Maps a failed submission to a blocking message; the backend message/code stays authoritative. */
function describeSubmitError(error: unknown, t: Translate): { title: string; message: string; requestId?: string } {
  if (error instanceof ApiClientError) {
    if (error.statusCode === 409 && error.code === EVALUATION_ALREADY_OPEN) {
      return {
        title: t('ic_err_all_blocked_title', 'No evaluation was created'),
        message: t(
          'ic_err_all_blocked_msg',
          'Every selected employee already has an active evaluation ({code}). Finish or close it before creating a new one.',
          { code: error.code }
        ),
        requestId: error.requestId,
      };
    }
    if (error.statusCode === 403) {
      return {
        title: t('ic_err_forbidden_title', 'Not allowed'),
        message: `${error.message} ${t('ic_err_forbidden_msg', 'You can only create individual evaluations for employees within your permission scope.')}`,
        requestId: error.requestId,
      };
    }
    return {
      title: t('ic_err_generic_title', 'Could not create individual evaluations'),
      message: `${error.message} (${error.code})`,
      requestId: error.requestId,
    };
  }
  return {
    title: t('ic_err_generic_title', 'Could not create individual evaluations'),
    message: error instanceof Error ? error.message : t('ic_err_unexpected', 'Unexpected error.'),
  };
}

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '20px',
  borderRadius: '12px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: TYPOGRAPHY.fontSize.base,
  fontWeight: TYPOGRAPHY.fontWeight.semibold,
  color: 'var(--text-primary)',
};

const sectionHintStyle: React.CSSProperties = {
  margin: '2px 0 0',
  fontSize: '0.8125rem',
  color: 'var(--text-secondary)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  marginBottom: '6px',
  color: 'var(--text-primary)',
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: `1px solid ${hasError ? COLORS.status.error : 'var(--border-subtle)'}`,
  fontSize: '0.875rem',
  boxSizing: 'border-box',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  colorScheme: 'light dark',
});

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" style={{ color: COLORS.status.error, fontSize: '0.75rem' }}>
      {message}
    </span>
  );
}

export const IndividualCycleCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useIndividualCycleTranslation();
  const { isDark } = useTheme();
  const isMobile = useIsMobile();
  const employeesQuery = useEmployees();
  const templatesQuery = useTemplatesQuery();
  const teamsQuery = useTeams();
  const createMutation = useCreateIndividualCyclesMutation();

  const today = toIsoDate(new Date());
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [templateVersionId, setTemplateVersionId] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, DEFAULT_DURATION_DAYS));
  const [errors, setErrors] = useState<FormErrors>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [result, setResult] = useState<IndividualCycleCreationResult | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const isManager = user?.role === 'MANAGER';
  const managedTeamIds = useMemo(() => user?.managedTeamIds ?? [], [user?.managedTeamIds]);
  const backTarget = isManager ? '/admin/team-evaluations' : '/admin/cycles';
  const defaultCycleName = t('ic_name_default', 'Individual Review');

  // UX only: the backend enforces eligibility and the manager's team scope.
  const eligibleEmployees = useMemo(
    () =>
      (employeesQuery.data ?? []).filter(
        (employee) =>
          employee.employmentStatus === ACTIVE_EMPLOYMENT_STATUS &&
          (!isManager || (employee.teamId !== null && managedTeamIds.includes(employee.teamId)))
      ),
    [employeesQuery.data, isManager, managedTeamIds]
  );

  const teamNameById = useMemo(
    () => new Map((teamsQuery.data ?? []).map((team) => [team.id, team.name] as [string, string])),
    [teamsQuery.data]
  );

  const templateOptions = useMemo(
    () => (templatesQuery.data ?? []).map(toTemplateOption).filter((option): option is TemplateOption => option !== null),
    [templatesQuery.data]
  );

  const employeeLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    for (const employee of employeesQuery.data ?? []) {
      labels.set(employee.id, `${employee.fullName} (${employee.employeeCode})`);
    }
    return labels;
  }, [employeesQuery.data]);
  const getEmployeeLabel = (employeeId: string) => employeeLabelById.get(employeeId) ?? employeeId;

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (selectedEmployeeIds.length === 0) nextErrors.employeeIds = t('ic_err_employees', 'Select at least one employee.');
    if (!templateVersionId) nextErrors.templateVersionId = t('ic_err_template', 'Evaluation template is required.');
    if (!startDate) nextErrors.startDate = t('ic_err_start', 'Start date is required.');
    if (!endDate) nextErrors.endDate = t('ic_err_end', 'End date is required.');
    if (startDate && endDate && startDate > endDate) {
      nextErrors.endDate = t('ic_err_date_order', 'End date must be on or after the start date.');
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleReview = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (validate()) {
      setIsConfirmOpen(true);
    }
  };

  const handleConfirm = async () => {
    try {
      const created = await createMutation.mutateAsync({
        name: name.trim() || undefined,
        templateVersionId,
        employeeIds: selectedEmployeeIds,
        startDate,
        endDate,
      });
      setResult(created);
      setSubmitError(null);
    } catch (error) {
      setSubmitError(error);
    } finally {
      setIsConfirmOpen(false);
    }
  };

  const handleStartOver = () => {
    setResult(null);
    setSubmitError(null);
    setSelectedEmployeeIds([]);
  };

  const isLoading = employeesQuery.isLoading || templatesQuery.isLoading;
  const loadError = employeesQuery.error ?? templatesQuery.error;
  const submitErrorView = submitError ? describeSubmitError(submitError, t) : null;

  const errorBoxStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: RADII.md,
    background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.4)' : '#fecaca'}`,
    color: isDark ? '#fca5a5' : '#b91c1c',
    fontSize: TYPOGRAPHY.fontSize.sm,
    wordBreak: 'break-word',
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column-reverse' : 'row',
    alignItems: isMobile ? 'stretch' : 'center',
    justifyContent: 'flex-end',
    gap: '12px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px' }}>
      <button
        type="button"
        onClick={() => navigate(backTarget)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
          width: 'fit-content',
        }}
      >
        <ArrowLeft size={16} />{' '}
        {isManager ? t('ic_back_team', 'Back to Team Reviews') : t('ic_back_cycles', 'Back to Evaluation Cycles')}
      </button>

      <div>
        <h1
          style={{
            margin: 0,
            fontSize: isMobile ? TYPOGRAPHY.fontSize.xl : TYPOGRAPHY.fontSize['2xl'],
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: 'var(--text-primary)',
          }}
        >
          {t('ic_page_title', 'Create Individual Evaluation')}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: TYPOGRAPHY.fontSize.sm, color: 'var(--text-secondary)' }}>
          {t(
            'ic_page_subtitle',
            'Creates a separate evaluation cycle for each selected employee, opened immediately with the chosen published template.'
          )}
        </p>
      </div>

      {isLoading && <LoadingSpinner label={t('ic_loading', 'Loading employees and templates...')} />}
      {loadError && !isLoading && (
        <ErrorAlert
          error={loadError}
          onRetry={() => {
            void employeesQuery.refetch();
            void templatesQuery.refetch();
          }}
        />
      )}

      {submitErrorView && (
        <div role="alert" style={errorBoxStyle}>
          <strong>{submitErrorView.title}</strong>
          <div>{submitErrorView.message}</div>
          {submitErrorView.requestId && (
            <div style={{ marginTop: '4px', fontSize: TYPOGRAPHY.fontSize.xs }}>
              {t('ic_request_id', 'Request ID')}: {submitErrorView.requestId}
            </div>
          )}
        </div>
      )}

      {result ? (
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>{t('ic_result_title', 'Result')}</h3>
          <IndividualCycleResultPanel result={result} getEmployeeLabel={getEmployeeLabel} canOpenCycle={!isManager} />
          <div style={footerStyle}>
            <Button variant="secondary" type="button" onClick={() => navigate(backTarget)}>
              {t('ic_btn_done', 'Done')}
            </Button>
            <Button type="button" onClick={handleStartOver}>
              {t('ic_btn_create_another', 'Create another')}
            </Button>
          </div>
        </section>
      ) : (
        !isLoading && (
          <form onSubmit={handleReview} noValidate style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px' }}>
            <section style={{ ...sectionStyle, padding: isMobile ? '16px' : '20px' }}>
              <div>
                <h3 style={sectionTitleStyle}>{t('ic_section_employees', 'Select employees')}</h3>
                <p style={sectionHintStyle}>
                  {t(
                    'ic_section_employees_hint',
                    'Each selected employee gets their own cycle. Employees who already have an active evaluation will be skipped.'
                  )}
                </p>
              </div>
              <IndividualEmployeePicker
                employees={eligibleEmployees}
                selectedEmployeeIds={selectedEmployeeIds}
                onChange={setSelectedEmployeeIds}
                teamNameById={teamNameById}
                error={errors.employeeIds}
                disabled={createMutation.isPending}
              />
            </section>

            <section style={{ ...sectionStyle, padding: isMobile ? '16px' : '20px' }}>
              <div>
                <h3 style={sectionTitleStyle}>{t('ic_section_settings', 'Cycle settings')}</h3>
                <p style={sectionHintStyle}>{t('ic_section_settings_hint', 'Applied to every cycle created in this request.')}</p>
              </div>
              <div>
                <label htmlFor="individual-template" style={labelStyle}>
                  {t('ic_template_label', 'Published Template Version *')}
                </label>
                <select
                  id="individual-template"
                  value={templateVersionId}
                  onChange={(event) => setTemplateVersionId(event.target.value)}
                  disabled={createMutation.isPending}
                  style={inputStyle(Boolean(errors.templateVersionId))}
                >
                  <option value="">{t('ic_template_placeholder', '-- Select Published Template Version --')}</option>
                  {templateOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.templateVersionId} />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                }}
              >
                <div>
                  <label htmlFor="individual-name" style={labelStyle}>
                    {t('ic_name_label', 'Cycle Name')}
                  </label>
                  <input
                    id="individual-name"
                    type="text"
                    maxLength={140}
                    placeholder={defaultCycleName}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={createMutation.isPending}
                    style={inputStyle(false)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('ic_name_hint', 'Saved as “{name} - employee code”', { name: name.trim() || defaultCycleName })}
                  </span>
                </div>
                <div>
                  <label htmlFor="individual-start-date" style={labelStyle}>
                    {t('ic_start_label', 'Start Date *')}
                  </label>
                  <input
                    id="individual-start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    disabled={createMutation.isPending}
                    style={inputStyle(Boolean(errors.startDate))}
                  />
                  <FieldError message={errors.startDate} />
                </div>
                <div>
                  <label htmlFor="individual-end-date" style={labelStyle}>
                    {t('ic_end_label', 'End Date *')}
                  </label>
                  <input
                    id="individual-end-date"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    disabled={createMutation.isPending}
                    style={inputStyle(Boolean(errors.endDate))}
                  />
                  <FieldError message={errors.endDate} />
                </div>
              </div>
            </section>

            <div style={footerStyle}>
              <Button variant="secondary" type="button" onClick={() => navigate(backTarget)} disabled={createMutation.isPending}>
                {t('ic_btn_cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('ic_btn_creating', 'Creating…') : t('ic_btn_review', 'Review and create')}
              </Button>
            </div>
          </form>
        )
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={t('ic_confirm_title', 'Create individual evaluations?')}
        description={
          <span>
            {t(
              'ic_confirm_desc',
              '{count} employee(s) will each get a new evaluation cycle from {start} to {end}, opened immediately. Employees who already have an active evaluation will be skipped.',
              { count: selectedEmployeeIds.length, start: startDate, end: endDate }
            )}
          </span>
        }
        confirmLabel={t('ic_btn_create', 'Create')}
        cancelLabel={t('ic_btn_cancel', 'Cancel')}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setIsConfirmOpen(false)}
        isPending={createMutation.isPending}
      />
    </div>
  );
};
