import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployees';
import { ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgEmployee } from '../domain/organization-models';
import { useDepartments } from '../hooks/useDepartments';
import { useTeams } from '../hooks/useTeams';
import { useJobRoles } from '../hooks/useJobRoles';
import { useJobLevels } from '../hooks/useJobLevels';
import { AutoCodeButton } from '../../../shared/components/AutoCodeButton';
import { generateCode } from '../../../shared/utils/code-generator';

const reviewCadenceMonths: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  BIANNUALLY: 6,
  ANNUALLY: 12,
};

function normalizeMonthValue(value: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  return value.slice(0, 7);
}

function formatMonthHint(value: string): string {
  const normalized = normalizeMonthValue(value);
  return normalized;
}

function addMonthsToMonthValue(monthValue: string, months: number): string {
  if (!monthValue) return '';
  const [yearText, monthText] = monthValue.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (Number.isNaN(year) || Number.isNaN(month)) return '';

  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + months);

  const resultYear = date.getUTCFullYear();
  const resultMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${resultYear}-${resultMonth}`;
}

function calculateNextReviewDate(lastReviewDate: string, reviewCadence: string): string {
  const months = reviewCadenceMonths[reviewCadence] ?? 1;
  if (!months) return '';
  return addMonthsToMonthValue(normalizeMonthValue(lastReviewDate), months);
}

function monthToDateValue(value: string): string {
  const normalized = normalizeMonthValue(value);
  return normalized ? `${normalized}-01` : '';
}

function dateToMonthValue(value: string | null | undefined): string {
  if (!value) return '';
  const parsedDate = new Date(value);
  if (!Number.isNaN(parsedDate.getTime())) {
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  return normalizeMonthValue(value.slice(0, 7));
}

const createSchema = z.object({
  employee_code: z.string().optional(),
  full_name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  department_id: z.string().min(1, 'Department is required'),
  team_id: z.string().optional(),
  role_id: z.string().min(1, 'Job Role is required'),
  job_level_id: z.string().min(1, 'Job Level is required'),
  manager_id: z.string().optional(),
  employment_status: z.string().optional(),
  review_cadence: z.string().optional(),
  last_evaluation_completed_at: z.string().optional().or(z.literal('')),
  next_review_due_date: z.string().min(1, 'Next Review Date is required'),
});

const updateSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  department_id: z.string().min(1, 'Department is required'),
  team_id: z.string().optional(),
  role_id: z.string().min(1, 'Job Role is required'),
  job_level_id: z.string().min(1, 'Job Level is required'),
  manager_id: z.string().optional(),
  employment_status: z.string().optional(),
  review_cadence: z.string().optional(),
  last_evaluation_completed_at: z.string().optional().or(z.literal('')),
  next_review_due_date: z.string().min(1, 'Next Review Date is required'),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

interface EmployeeFormModalProps {
  isOpen: boolean;
  employee?: OrgEmployee;
  initialDepartmentId?: string;
  initialTeamId?: string;
  onClose: () => void;
}

export function EmployeeFormModal({ isOpen, employee, initialDepartmentId, initialTeamId, onClose }: EmployeeFormModalProps) {
  const isEditMode = employee !== undefined;
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const isInitializingRef = useRef(false);
  
  const { data: departments } = useDepartments();
  const { data: teams } = useTeams();
  const { data: roles } = useJobRoles();
  const { data: levels } = useJobLevels();

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const isDeptLocked = !isEditMode && !!initialDepartmentId;
  const isTeamLocked = !isEditMode && !!initialTeamId;

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateFormValues | UpdateFormValues>({
    resolver: zodResolver(isEditMode ? updateSchema : createSchema),
    defaultValues: employee
      ? {
          full_name: employee.fullName,
          email: employee.email,
          department_id: employee.departmentId || '',
          team_id: employee.teamId || '',
          role_id: employee.roleId,
          job_level_id: employee.jobLevelId,
          manager_id: employee.managerId || '',
          employment_status: employee.employmentStatus,
          review_cadence: employee.reviewCadence || '',
          last_evaluation_completed_at: dateToMonthValue(employee.lastEvaluationCompletedAt),
          next_review_due_date: dateToMonthValue(employee.nextReviewDueDate),
        }
      : {
          employee_code: '',
          full_name: '',
          email: '',
          department_id: initialDepartmentId || '',
          team_id: initialTeamId || '',
          role_id: '',
          job_level_id: '',
          manager_id: '',
          employment_status: 'ACTIVE',
          review_cadence: '',
          last_evaluation_completed_at: '',
          next_review_due_date: '',
        },
  });

  useEffect(() => {
    if (isOpen) {
      isInitializingRef.current = true;
      reset(
        employee
          ? {
              full_name: employee.fullName,
              email: employee.email,
              department_id: employee.departmentId || '',
              team_id: employee.teamId || '',
              role_id: employee.roleId,
              job_level_id: employee.jobLevelId,
              manager_id: employee.managerId || '',
              employment_status: employee.employmentStatus,
              review_cadence: employee.reviewCadence || '',
              last_evaluation_completed_at: dateToMonthValue(employee.lastEvaluationCompletedAt),
              next_review_due_date: dateToMonthValue(employee.nextReviewDueDate),
            }
          : {
              employee_code: '',
              full_name: '',
              email: '',
              department_id: initialDepartmentId || '',
              team_id: initialTeamId || '',
              role_id: '',
              job_level_id: '',
              manager_id: '',
              employment_status: 'ACTIVE',
              review_cadence: '',
              last_evaluation_completed_at: '',
              next_review_due_date: '',
            },
      );
      createMutation.reset();
      updateMutation.reset();
      queueMicrotask(() => {
        isInitializingRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employee?.id, initialDepartmentId, initialTeamId]);

  const selectedDeptId = watch('department_id');
  const selectedCadence = watch('review_cadence');
  const selectedLastReviewDate = watch('last_evaluation_completed_at');

  useEffect(() => {
    if (isInitializingRef.current) return;
    if (!selectedLastReviewDate) return;
    const nextReviewDate = calculateNextReviewDate(selectedLastReviewDate, selectedCadence || '');
    if (nextReviewDate) {
      setValue('next_review_due_date', nextReviewDate, { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedLastReviewDate, selectedCadence, setValue]);
  
  const filteredDepartments = departments?.filter(d => d.isActive || d.id === employee?.departmentId) ?? [];
  const filteredTeams = teams?.filter(t => t.isActive || t.id === employee?.teamId) ?? [];
  const filteredRoles = roles?.filter(r => r.isActive || r.id === employee?.roleId) ?? [];
  const filteredLevels = levels?.filter(l => l.isActive || l.id === employee?.jobLevelId) ?? [];

  const teamsInDept = selectedDeptId 
    ? filteredTeams.filter(t => t.departmentId === selectedDeptId) 
    : [];

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const normalizedValues = {
        ...values,
        last_evaluation_completed_at: monthToDateValue(values.last_evaluation_completed_at || ''),
        next_review_due_date: monthToDateValue(values.next_review_due_date || ''),
      };

      if (isEditMode) {
        await updateMutation.mutateAsync({ id: employee.id, data: normalizedValues as UpdateFormValues });
      } else {
        await createMutation.mutateAsync(normalizedValues as CreateFormValues);
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const apiErr = err as { code: string; message: string };
        if (apiErr.code === 'DUPLICATE_EMPLOYEE_CODE') {
          setError('employee_code' as keyof CreateFormValues, {
            message: 'This employee code is already in use.',
          });
        }
        if (apiErr.code === 'DEPARTMENT_INACTIVE') {
          setError('department_id', { message: apiErr.message });
        }
        if (apiErr.code === 'TEAM_INACTIVE' || apiErr.code === 'TEAM_DEPARTMENT_MISMATCH') {
          setError('team_id', { message: apiErr.message });
        }
        if (apiErr.code === 'JOB_ROLE_INACTIVE') {
          setError('role_id', { message: apiErr.message });
        }
        if (apiErr.code === 'JOB_LEVEL_INACTIVE') {
          setError('job_level_id', { message: apiErr.message });
        }
      }
    }
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-form-dialog-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 600, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 id="employee-form-dialog-title" style={{ margin: '0 0 1rem' }}>
          {isEditMode ? 'Edit Employee' : 'Add Employee'}
        </h2>

        {mutationError && <ErrorAlert error={mutationError} />}

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isEditMode && (
            <div style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 6,
              color: '#1e40af',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span>ℹ️</span>
              <span>A default user account will be created automatically with password <strong>Welcome@123</strong>.</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {!isEditMode && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label htmlFor="emp-code" style={{ fontWeight: 500 }}>
                    Employee Code
                  </label>
                  <AutoCodeButton
                    onClick={() => {
                      const code = generateCode('EMP', watch('full_name'));
                      setValue('employee_code' as keyof CreateFormValues, code);
                    }}
                  />
                </div>
                <input 
                  id="emp-code" 
                  type="text" 
                  {...register('employee_code' as keyof CreateFormValues)} 
                  style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }} 
                  placeholder="Leave empty to auto-generate"
                />
                {(errors as Record<string, { message?: string }>).employee_code && (
                  <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                    {(errors as Record<string, { message?: string }>).employee_code?.message}
                  </span>
                )}
              </div>
            )}

            <div>
              <label htmlFor="emp-name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Full Name *
              </label>
              <input 
                id="emp-name" 
                type="text" 
                aria-required="true" 
                {...register('full_name')} 
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }} 
              />
              {errors.full_name && (
                <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  {errors.full_name.message}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="emp-email" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Email
              </label>
              <input 
                id="emp-email" 
                type="email" 
                {...register('email')} 
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }} 
              />
              {errors.email && (
                <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  {errors.email.message}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="emp-status" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Employment Status
              </label>
              <select 
                id="emp-status" 
                {...register('employment_status')} 
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="ON_LEAVE">ON_LEAVE</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
            </div>

            <div>
              <label htmlFor="emp-cadence" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Review Cadence
              </label>
              <select 
                id="emp-cadence" 
                {...register('review_cadence')} 
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
              >
                <option value="">-- No Cadence --</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="BIANNUALLY">Biannually</option>
                <option value="ANNUALLY">Annually</option>
              </select>
            </div>

            <div>
              <label htmlFor="emp-last-review-date" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Last Review Date
              </label>
              <input
                id="emp-last-review-date"
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM"
                {...register('last_evaluation_completed_at')}
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                onBlur={(event) => {
                  const value = formatMonthHint(event.target.value);
                  if (value) {
                    setValue('last_evaluation_completed_at', value, { shouldValidate: true, shouldDirty: true });
                  }
                }}
              />
              {errors.last_evaluation_completed_at && (
                <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  {errors.last_evaluation_completed_at.message}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="emp-next-review-date" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Next Review Date *
              </label>
              <input
                id="emp-next-review-date"
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM"
                {...register('next_review_due_date')}
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                onBlur={(event) => {
                  const value = formatMonthHint(event.target.value);
                  if (value) {
                    setValue('next_review_due_date', value, { shouldValidate: true, shouldDirty: true });
                  }
                }}
              />
              {errors.next_review_due_date && (
                <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  {errors.next_review_due_date.message}
                </span>
              )}
            </div>

            {!isDeptLocked ? (
              <div>
                <label htmlFor="emp-dept" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Department
                </label>
                <select 
                  id="emp-dept" 
                  {...register('department_id')} 
                  style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                >
                  <option value="">-- Select Department --</option>
                  {filteredDepartments.map(d => (
                    <option key={d.id} value={d.id}>
                      {!d.isActive ? `[Inactive] ${d.name}` : d.name}
                    </option>
                  ))}
                </select>
                {(errors as Record<string, { message?: string }>).department_id && (
                  <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                    {(errors as Record<string, { message?: string }>).department_id?.message}
                  </span>
                )}
              </div>
            ) : (
              <input type="hidden" {...register('department_id')} />
            )}

            {!isTeamLocked && (
              <div>
                <label htmlFor="emp-team" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Team
                </label>
                <select 
                  id="emp-team" 
                  {...register('team_id')} 
                  style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  disabled={!selectedDeptId}
                >
                  <option value="">-- No Team --</option>
                  {teamsInDept.map(t => (
                    <option key={t.id} value={t.id}>
                      {!t.isActive ? `[Inactive] ${t.name}` : t.name}
                    </option>
                  ))}
                </select>
                {(errors as Record<string, { message?: string }>).team_id && (
                  <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                    {(errors as Record<string, { message?: string }>).team_id?.message}
                  </span>
                )}
              </div>
            )}
            {isTeamLocked && <input type="hidden" {...register('team_id')} />}

            <div>
              <label htmlFor="emp-role" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Job Role
              </label>
              <select 
                id="emp-role" 
                {...register('role_id')} 
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
              >
                <option value="">-- Select Role --</option>
                {filteredRoles.map(r => (
                  <option key={r.id} value={r.id}>
                    {!r.isActive ? `[Inactive] ${r.name}` : r.name}
                  </option>
                ))}
              </select>
              {(errors as Record<string, { message?: string }>).role_id && (
                <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  {(errors as Record<string, { message?: string }>).role_id?.message}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="emp-level" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Job Level
              </label>
              <select 
                id="emp-level" 
                {...register('job_level_id')} 
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
              >
                <option value="">-- Select Level --</option>
                {filteredLevels.map(l => (
                  <option key={l.id} value={l.id}>
                    {!l.isActive ? `[Inactive] ${l.name}` : l.name}
                  </option>
                ))}
              </select>
              {(errors as Record<string, { message?: string }>).job_level_id && (
                <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  {(errors as Record<string, { message?: string }>).job_level_id?.message}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEditMode ? 'Save Changes' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
