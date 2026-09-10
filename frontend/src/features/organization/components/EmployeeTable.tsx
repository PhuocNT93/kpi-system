import { useState, useRef, useEffect } from 'react';
import { useEmployees, useBulkUpdateEmployees } from '../hooks/useEmployees';
import { useJobRoles } from '../hooks/useJobRoles';
import { useJobLevels } from '../hooks/useJobLevels';
import { useAuth } from '../../../shared/auth/auth-context';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge, ConfirmDialog } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgEmployee } from '../domain/organization-models';
import { EmployeeFormModal } from './EmployeeFormModal';
import { BulkActionBar } from './BulkActionBar';

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

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ type: 'ACTIVE' | 'INACTIVE'; isOpen: boolean } | null>(null);
  const bulkUpdateMutation = useBulkUpdateEmployees();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const employees = employeesQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const levels = levelsQuery.data ?? [];

  const isAllSelected = employees.length > 0 && selectedIds.size === employees.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < employees.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map((e) => e.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkConfirm = async () => {
    if (!bulkAction) return;
    try {
      await bulkUpdateMutation.mutateAsync({
        employeeIds: Array.from(selectedIds),
        status: bulkAction.type,
      });
      setSelectedIds(new Set());
      setBulkAction(null);
    } catch {
      // Mutation error will be displayed inside ConfirmDialog
    }
  };

  const handleBulkCancel = () => {
    bulkUpdateMutation.reset();
    setBulkAction(null);
  };

  if (employeesQuery.isPending) return <LoadingSpinner label="Loading employees..." />;
  if (employeesQuery.isError) return <ErrorAlert error={employeesQuery.error} onRetry={() => employeesQuery.refetch()} />;

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
    <div style={{ paddingBottom: '6rem' }}>
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
                {isAdmin && (
                  <th style={{ padding: '0.75rem 1rem', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      ref={headerCheckboxRef}
                      checked={isAllSelected}
                      onChange={handleToggleAll}
                      aria-label="Select all employees"
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                )}
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                <th style={{ padding: '0.75rem 1rem' }}>Level</th>
                <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                <th style={{ padding: '0.75rem 1rem' }}>Review Cadence</th>
                <th style={{ padding: '0.75rem 1rem' }}>Last Review Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Next Review Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const isSelected = selectedIds.has(emp.id);
                return (
                  <tr
                    key={emp.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: isSelected ? '#eff6ff' : undefined,
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {isAdmin && (
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(emp.id)}
                          aria-label={`Select employee ${emp.fullName}`}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                    )}
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
                    <td style={{ padding: '0.75rem 1rem', color: '#ea580c', fontSize: '0.875rem', fontWeight: 500 }}>
                      {formatDate(emp.nextReviewDueDate)}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Action Bar */}
      {isAdmin && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          entityName={selectedIds.size === 1 ? 'employee' : 'employees'}
          onActivate={() => {
            bulkUpdateMutation.reset();
            setBulkAction({ type: 'ACTIVE', isOpen: true });
          }}
          onDeactivate={() => {
            bulkUpdateMutation.reset();
            setBulkAction({ type: 'INACTIVE', isOpen: true });
          }}
          onClearSelection={() => setSelectedIds(new Set())}
          isPending={bulkUpdateMutation.isPending}
        />
      )}

      {/* Bulk Action Confirmation Modal */}
      {isAdmin && (
        <ConfirmDialog
          isOpen={bulkAction !== null && bulkAction.isOpen}
          title={`${bulkAction?.type === 'ACTIVE' ? 'Activate' : 'Deactivate'} Employees`}
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: 0 }}>
                Are you sure you want to {bulkAction?.type === 'ACTIVE' ? 'activate' : 'deactivate'}{' '}
                <strong>{selectedIds.size}</strong> selected employee(s)?
              </p>
              {bulkAction?.type === 'ACTIVE' && (
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>
                  Note: An employee can only be activated if their department, team, role, and job level are all active.
                </p>
              )}
              {bulkUpdateMutation.isError && <ErrorAlert error={bulkUpdateMutation.error} />}
            </div>
          }
          confirmLabel={bulkAction?.type === 'ACTIVE' ? 'Activate' : 'Deactivate'}
          isPending={bulkUpdateMutation.isPending}
          onConfirm={handleBulkConfirm}
          onCancel={handleBulkCancel}
        />
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

