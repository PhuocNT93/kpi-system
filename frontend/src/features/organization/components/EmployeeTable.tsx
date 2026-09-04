import { useState } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { useJobRoles } from '../hooks/useJobRoles';
import { useJobLevels } from '../hooks/useJobLevels';
import { useAuth } from '../../../shared/auth/AuthContext';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgEmployee } from '../domain/organization-models';
import { EmployeeFormModal } from './EmployeeFormModal';

export function EmployeeTable({ departmentId, teamId }: { departmentId?: string; teamId?: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  
  const filters: Record<string, string> = {};
  if (departmentId) filters.department_id = departmentId;
  if (teamId) filters.team_id = teamId;

  const employeesQuery = useEmployees(filters);
  const rolesQuery = useJobRoles();
  const levelsQuery = useJobLevels();

  const [editingEmployee, setEditingEmployee] = useState<OrgEmployee | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (employeesQuery.isPending) return <LoadingSpinner label="Loading employees..." />;
  if (employeesQuery.isError) return <ErrorAlert error={employeesQuery.error} onRetry={() => employeesQuery.refetch()} />;

  const employees = employeesQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const levels = levelsQuery.data ?? [];

  const getRoleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? roleId;
  const getLevelName = (levelId: string) => levels.find((l) => l.id === levelId)?.name ?? levelId;

  const formatCadence = (cadence: string | null) => {
    if (!cadence) return '-';
    return cadence.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

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
                <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                <th style={{ padding: '0.75rem 1rem' }}>Level</th>
                <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                <th style={{ padding: '0.75rem 1rem' }}>Review Cadence</th>
                <th style={{ padding: '0.75rem 1rem' }}>Last Review Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{emp.employeeCode}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{emp.fullName}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                      {getRoleName(emp.roleId)}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                      {getLevelName(emp.jobLevelId)}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{emp.email}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {emp.reviewCadence ? (
                      <span style={{ backgroundColor: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                        {formatCadence(emp.reviewCadence)}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>Not Set</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#4b5563', fontSize: '0.875rem' }}>
                    {formatDate(emp.lastEvaluationCompletedAt)}
                  </td>
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
          initialDepartmentId={departmentId}
          initialTeamId={teamId}
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
