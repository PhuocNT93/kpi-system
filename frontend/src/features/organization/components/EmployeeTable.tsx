import { useState } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { useAuth } from '../../../shared/auth/auth-context';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgEmployee } from '../domain/organization-models';
import { EmployeeFormModal } from './EmployeeFormModal';

export function EmployeeTable() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  
  const employeesQuery = useEmployees();
  const [editingEmployee, setEditingEmployee] = useState<OrgEmployee | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (employeesQuery.isPending) return <LoadingSpinner label="Loading employees..." />;
  if (employeesQuery.isError) return <ErrorAlert error={employeesQuery.error} onRetry={() => employeesQuery.refetch()} />;

  const employees = employeesQuery.data ?? [];

  return (
    <div>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Button id="create-employee-btn" onClick={() => setIsCreateOpen(true)} size="sm">
            + Add Employee
          </Button>
        </div>
      )}

      {employees.length === 0 ? (
        <EmptyState message="No employees found." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{emp.employeeCode}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{emp.fullName}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{emp.email}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <StatusBadge status={emp.employmentStatus} />
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="outlined"
                        size="sm"
                        aria-label={`Edit employee ${emp.fullName}`}
                        onClick={() => setEditingEmployee(emp)}
                      >
                        Edit
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      {isAdmin && (
        <EmployeeFormModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {/* Edit Dialog */}
      {isAdmin && (
        <EmployeeFormModal
          isOpen={editingEmployee !== undefined}
          employee={editingEmployee}
          onClose={() => setEditingEmployee(undefined)}
        />
      )}
    </div>
  );
}

