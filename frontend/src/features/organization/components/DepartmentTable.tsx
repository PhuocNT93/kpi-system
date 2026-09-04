import { useState } from 'react';
import { useDepartments } from '../hooks/useDepartments';
import { useAuth } from '../../../shared/auth/auth-context';
import { DepartmentFormModal } from './DepartmentFormModal';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgDepartment } from '../domain/organization-models';

export function DepartmentTable() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  
  const departmentsQuery = useDepartments();
  const [editingDepartment, setEditingDepartment] = useState<OrgDepartment | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (departmentsQuery.isPending) return <LoadingSpinner label="Loading departments..." />;
  if (departmentsQuery.isError) return <ErrorAlert error={departmentsQuery.error} onRetry={() => departmentsQuery.refetch()} />;

  const departments = departmentsQuery.data ?? [];

  return (
    <div>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Button id="create-department-btn" onClick={() => setIsCreateOpen(true)} size="sm">
            + Create Department
          </Button>
        </div>
      )}

      {departments.length === 0 ? (
        <EmptyState message="No departments found." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{dept.code}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{dept.name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <StatusBadge status={dept.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="outlined"
                        size="sm"
                        aria-label={`Edit department ${dept.name}`}
                        onClick={() => setEditingDepartment(dept)}
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
        <DepartmentFormModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {/* Edit Dialog */}
      {isAdmin && (
        <DepartmentFormModal
          isOpen={editingDepartment !== undefined}
          department={editingDepartment}
          onClose={() => setEditingDepartment(undefined)}
        />
      )}
    </div>
  );
}

