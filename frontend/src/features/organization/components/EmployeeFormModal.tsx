import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployees';
import { ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgEmployee } from '../domain/organization-models';

const createSchema = z.object({
  employee_code: z.string().optional(),
  full_name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  department_id: z.string().optional(),
  team_id: z.string().optional(),
  role_id: z.string().optional(),
  job_level_id: z.string().optional(),
  manager_id: z.string().optional(),
  employment_status: z.string().optional(),
});

const updateSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  department_id: z.string().optional(),
  team_id: z.string().optional(),
  role_id: z.string().optional(),
  job_level_id: z.string().optional(),
  manager_id: z.string().optional(),
  employment_status: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

interface EmployeeFormModalProps {
  isOpen: boolean;
  employee?: OrgEmployee;
  onClose: () => void;
}

export function EmployeeFormModal({ isOpen, employee, onClose }: EmployeeFormModalProps) {
  const isEditMode = employee !== undefined;
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const {
    register,
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
          department_id: '',
          team_id: '',
          role_id: '',
          job_level_id: '',
          manager_id: '',
          employment_status: 'ACTIVE',
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
            }
          : {
              employee_code: '',
              full_name: '',
              email: '',
              department_id: '',
              team_id: '',
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
  }, [isOpen, employee?.id]);

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
