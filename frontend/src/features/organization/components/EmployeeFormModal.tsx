import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateEmployee,
  useUpdateEmployee,
  useUpdateEmployeeCadenceOverride,
} from '../hooks/useEmployees';
import { organizationKeys } from '../api/organization-keys';
import { useCanManageReviewCadence } from '../hooks/useCanManageReviewCadence';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';
import { EmployeeReviewSchedulePanel, ReviewCadenceOverrideSelect } from './EmployeeReviewSchedulePanel';
import { ErrorAlert } from '../../../shared/components/ui';
import { ApiClientError } from '../../../shared/api/api-client';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgEmployee } from '../domain/organization-models';
import { useDepartments } from '../hooks/useDepartments';
import { useTeams } from '../hooks/useTeams';
import { useJobRoles } from '../hooks/useJobRoles';
import { useJobLevels } from '../hooks/useJobLevels';
import { AutoCodeButton } from '../../../shared/components/AutoCodeButton';
import { generateCode } from '../../../shared/utils/code-generator';
import { useTheme } from '../../../shared/theme';

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
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const queryClient = useQueryClient();
  const canManageCadence = useCanManageReviewCadence();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const updateCadenceOverrideMutation = useUpdateEmployeeCadenceOverride();
  const [cadenceOverrideId, setCadenceOverrideId] = useState<string>(employee?.reviewCadenceOverrideId || '');
  const [cadenceOverrideReason, setCadenceOverrideReason] = useState<string>('');
  
  const { data: departments } = useDepartments();
  const { data: teams } = useTeams();
  const { data: roles } = useJobRoles();
  const { data: levels } = useJobLevels();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    updateCadenceOverrideMutation.isPending;
  const mutationError =
    createMutation.error ?? updateMutation.error ?? updateCadenceOverrideMutation.error;
  const mutationApiError = mutationError instanceof ApiClientError ? mutationError : null;
  const isVersionConflict = mutationApiError?.statusCode === 409;

  const handleReloadLatest = () => {
    void queryClient.invalidateQueries({ queryKey: organizationKeys.employees.all });
  };

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
        },
  });

  useEffect(() => {
    if (isOpen) {
      setCadenceOverrideId(employee?.reviewCadenceOverrideId || '');
      setCadenceOverrideReason('');
      updateCadenceOverrideMutation.reset();
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
            },
      );
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employee?.id, initialDepartmentId, initialTeamId]);

  const selectedDeptId = watch('department_id');
  const filteredDepartments = departments?.filter(d => d.isActive || d.id === employee?.departmentId) ?? [];
  const filteredTeams = teams?.filter(t => t.isActive || t.id === employee?.teamId) ?? [];
  const filteredRoles = roles?.filter(r => r.isActive || r.id === employee?.roleId) ?? [];
  const filteredLevels = levels?.filter(l => l.isActive || l.id === employee?.jobLevelId) ?? [];

  const teamsInDept = selectedDeptId 
    ? filteredTeams.filter(t => t.departmentId === selectedDeptId) 
    : [];

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    if (isPending) return;
    try {
      // Review schedule fields (last/next review dates, legacy cadence) are owned by the backend
      // and are never sent from this form.
      if (isEditMode) {
        await updateMutation.mutateAsync({ id: employee.id, data: values as UpdateFormValues });
        if (canManageCadence && cadenceOverrideId !== (employee.reviewCadenceOverrideId || '')) {
          await updateCadenceOverrideMutation.mutateAsync({
            employeeId: employee.id,
            reviewCadenceOverrideId: cadenceOverrideId || null,
            reason: cadenceOverrideReason || 'HR updated review cadence override via Employee Form',
          });
        }
      } else {
        await createMutation.mutateAsync({
          ...(values as CreateFormValues),
          ...(canManageCadence ? { review_cadence_override_id: cadenceOverrideId || null } : {}),
        });
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
      className="org-modal-overlay"
    >
      <div
        className="org-modal-card"
        style={{
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f8fafc' : '#111827',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          boxShadow: isDark ? '0 20px 25px -5px rgba(0,0,0,0.5)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          maxWidth: 620,
        }}
      >
        <h2 id="employee-form-dialog-title" style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#111827' }}>
          {isEditMode ? 'Edit Employee' : 'Add Employee'}
        </h2>

        {mutationError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.75rem' }}>
            <ErrorAlert error={mutationError} />
            {mutationApiError?.code && (
              <span data-testid="employee-form-error-code" style={{ fontSize: '0.75rem', color: isDark ? '#fca5a5' : '#b91c1c' }}>
                {t('error_code_label', 'Error code')}: {mutationApiError.code}
              </span>
            )}
            {isVersionConflict && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                <span>{t('error_version_conflict_hint', 'This employee was changed by someone else. Reload the latest data and try again.')}</span>
                <Button variant="outlined" size="sm" onClick={handleReloadLatest} disabled={isPending}>
                  {t('btn_reload_latest', 'Reload latest data')}
                </Button>
              </div>
            )}
          </div>
        )}

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

            {isEditMode && employee ? (
              <EmployeeReviewSchedulePanel
                employee={employee}
                overrideValue={cadenceOverrideId}
                onOverrideChange={setCadenceOverrideId}
                isOverrideDisabled={isPending}
              />
            ) : (
              <ReviewCadenceOverrideSelect
                value={cadenceOverrideId}
                onChange={setCadenceOverrideId}
                isDisabled={isPending}
              />
            )}

            {isEditMode && canManageCadence && cadenceOverrideId !== (employee?.reviewCadenceOverrideId || '') && (
              <div style={{ gridColumn: 'span 2' }}>
                <label
                  htmlFor="emp-cadence-reason"
                  style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    color: isDark ? '#fbbf24' : '#b45309',
                  }}
                >
                  Lý do điều chỉnh Chu kỳ Đánh giá (Audit Reason) *
                </label>
                <input
                  id="emp-cadence-reason"
                  type="text"
                  placeholder="Ví dụ: Đánh giá thử việc 2 tháng/lần, thay đổi theo phê duyệt HR..."
                  value={cadenceOverrideReason}
                  onChange={(e) => setCadenceOverrideReason(e.target.value)}
                  required
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${isDark ? '#f59e0b' : '#fcd34d'}`,
                    borderRadius: '4px',
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.05)' : '#fffbeb',
                    color: isDark ? '#f8fafc' : '#111827',
                  }}
                />
              </div>
            )}

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
