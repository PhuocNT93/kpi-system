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
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { IndividualEmployeePicker } from '../components/IndividualEmployeePicker';
import { IndividualCycleResultPanel } from '../components/IndividualCycleResultPanel';
import { useCreateIndividualCyclesMutation } from '../hooks/use-evaluation-cycles';
import { EVALUATION_ALREADY_OPEN } from '../types/cycle-types';
import type { IndividualCycleCreationResult } from '../types/cycle-types';

const ACTIVE_EMPLOYMENT_STATUS = 'ACTIVE';
const DEFAULT_DURATION_DAYS = 30;

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
    label: `${template.name} (v${versionNo}) — ${template.status}${criteriaCount ? ` (${criteriaCount} criteria)` : ''}`,
  };
}

/** Maps a failed submission to a blocking message; the backend message/code stays authoritative. */
function describeSubmitError(error: unknown): { title: string; message: string; requestId?: string } {
  if (error instanceof ApiClientError) {
    if (error.statusCode === 409 && error.code === EVALUATION_ALREADY_OPEN) {
      return {
        title: 'No evaluation was created',
        message: `Every selected employee already has an active evaluation (${error.code}). Finish or close it before creating a new one.`,
        requestId: error.requestId,
      };
    }
    if (error.statusCode === 403) {
      return {
        title: 'Not allowed',
        message: `${error.message} You can only create individual evaluations for employees within your permission scope.`,
        requestId: error.requestId,
      };
    }
    return { title: 'Could not create individual evaluations', message: `${error.message} (${error.code})`, requestId: error.requestId };
  }
  return { title: 'Could not create individual evaluations', message: error instanceof Error ? error.message : 'Unexpected error.' };
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
});

const footerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '12px',
};

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
    if (selectedEmployeeIds.length === 0) nextErrors.employeeIds = 'Select at least one employee.';
    if (!templateVersionId) nextErrors.templateVersionId = 'Evaluation template is required.';
    if (!startDate) nextErrors.startDate = 'Start date is required.';
    if (!endDate) nextErrors.endDate = 'End date is required.';
    if (startDate && endDate && startDate > endDate) nextErrors.endDate = 'End date must be on or after the start date.';
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
  const submitErrorView = submitError ? describeSubmitError(submitError) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <button
        type="button"
        onClick={() => navigate(backTarget)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: COLORS.neutral.textSecondary,
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
          width: 'fit-content',
        }}
      >
        <ArrowLeft size={16} /> {isManager ? 'Back to Team Reviews' : 'Back to Evaluation Cycles'}
      </button>

      <div>
        <h1 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
          Create Individual Evaluation
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
          Creates a separate evaluation cycle for each selected employee, opened immediately with the chosen published template.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Loading employees and templates..." />}
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
        <div
          role="alert"
          style={{ padding: '12px 16px', borderRadius: RADII.md, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: TYPOGRAPHY.fontSize.sm }}
        >
          <strong>{submitErrorView.title}</strong>
          <div>{submitErrorView.message}</div>
          {submitErrorView.requestId && <div style={{ marginTop: '4px', fontSize: TYPOGRAPHY.fontSize.xs }}>Request ID: {submitErrorView.requestId}</div>}
        </div>
      )}

      {result ? (
        <section style={{ ...sectionStyle }}>
          <h3 style={sectionTitleStyle}>Result</h3>
          <IndividualCycleResultPanel result={result} getEmployeeLabel={getEmployeeLabel} canOpenCycle={!isManager} />
          <div style={footerStyle}>
            <Button variant="secondary" type="button" onClick={() => navigate(backTarget)}>
              Done
            </Button>
            <Button type="button" onClick={handleStartOver}>
              Create another
            </Button>
          </div>
        </section>
      ) : (
        !isLoading && (
          <form
            onSubmit={handleReview}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <section style={sectionStyle}>
              <div>
                <h3 style={sectionTitleStyle}>Select employees</h3>
                <p style={sectionHintStyle}>
                  Each selected employee gets their own cycle. Employees who already have an active evaluation will be skipped.
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

            <section style={sectionStyle}>
              <div>
                <h3 style={sectionTitleStyle}>Cycle settings</h3>
                <p style={sectionHintStyle}>Applied to every cycle created in this request.</p>
              </div>
              <div>
                <label htmlFor="individual-template" style={labelStyle}>
                  Published Template Version *
                </label>
                <select
                  id="individual-template"
                  value={templateVersionId}
                  onChange={(event) => setTemplateVersionId(event.target.value)}
                  disabled={createMutation.isPending}
                  style={inputStyle(Boolean(errors.templateVersionId))}
                >
                  <option value="">-- Select Published Template Version --</option>
                  {templateOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.templateVersionId} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label htmlFor="individual-name" style={labelStyle}>
                    Cycle Name
                  </label>
                  <input
                    id="individual-name"
                    type="text"
                    maxLength={140}
                    placeholder="Individual Review"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={createMutation.isPending}
                    style={inputStyle(false)}
                  />
                  <span style={{ fontSize: '0.75rem', color: COLORS.neutral.textSecondary }}>
                    Saved as “{name.trim() || 'Individual Review'} - employee code”
                  </span>
                </div>
                <div>
                  <label htmlFor="individual-start-date" style={labelStyle}>
                    Start Date *
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
                    End Date *
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
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Review and create'}
              </Button>
            </div>
          </form>
        )
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Create individual evaluations?"
        description={
          <span>
            {selectedEmployeeIds.length} employee(s) will each get a new evaluation cycle from {startDate} to {endDate}, opened immediately.
            Employees who already have an active evaluation will be skipped.
          </span>
        }
        confirmLabel="Create"
        onConfirm={() => void handleConfirm()}
        onCancel={() => setIsConfirmOpen(false)}
        isPending={createMutation.isPending}
      />
    </div>
  );
};
