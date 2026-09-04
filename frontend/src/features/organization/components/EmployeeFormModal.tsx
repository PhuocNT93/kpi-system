import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployees';
import { ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgEmployee } from '../domain/organization-models';
import { useDepartments } from '../hooks/useDepartments';
import { useJobRoles } from '../hooks/useJobRoles';
import { useJobLevels } from '../hooks/useJobLevels';

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
  
  const { data: departments } = useDepartments();
  const { data: roles } = useJobRoles();
  const { data: levels } = useJobLevels();

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const isDeptLocked = !isEditMode && !!initialDepartmentId;
  const isTeamLocked = !isEditMode && !!initialTeamId;

  const {
    register,
    watch,
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
        },
  });

  useEffect(() => {
    if (isOpen) {
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
            },
      );
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employee?.id, initialDepartmentId, initialTeamId]);

  const selectedDeptId = watch('department_id');
  const teamsInDept = selectedDeptId 
    ? departments?.find(d => d.id === selectedDeptId)?.teams ?? [] 
    : [];

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({ id: employee.id, data: values as UpdateFormValues });
      } else {
        await createMutation.mutateAsync(values as CreateFormValues);
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {!isEditMode && (
              <div>
                <label htmlFor="emp-code" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Employee Code
                </label>
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
                  {departments?.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
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
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
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
                {roles?.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
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
                {levels?.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
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
