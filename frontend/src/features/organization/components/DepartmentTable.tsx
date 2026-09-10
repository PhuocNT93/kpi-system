import { useState, useRef, useEffect } from 'react';
import { useDepartments, useBulkUpdateDepartments } from '../hooks/useDepartments';
import { useAuth } from '../../../shared/auth/auth-context';
import { DepartmentFormModal } from './DepartmentFormModal';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge, ConfirmDialog } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgDepartment } from '../domain/organization-models';
import { BulkActionBar } from './BulkActionBar';

export function DepartmentTable() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  
  const departmentsQuery = useDepartments();
  const [editingDepartment, setEditingDepartment] = useState<OrgDepartment | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ type: 'ACTIVE' | 'INACTIVE'; isOpen: boolean } | null>(null);
  const bulkUpdateMutation = useBulkUpdateDepartments();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const departments = departmentsQuery.data ?? [];

  const isAllSelected = departments.length > 0 && selectedIds.size === departments.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < departments.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(departments.map((d) => d.id)));
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
        departmentIds: Array.from(selectedIds),
        active: bulkAction.type === 'ACTIVE',
      });
      setSelectedIds(new Set());
      setBulkAction(null);
    } catch {
      // Mutation error displayed in ConfirmDialog
    }
  };

  const handleBulkCancel = () => {
    bulkUpdateMutation.reset();
    setBulkAction(null);
  };

  if (departmentsQuery.isPending) return <LoadingSpinner label="Loading departments..." />;
  if (departmentsQuery.isError) return <ErrorAlert error={departmentsQuery.error} onRetry={() => departmentsQuery.refetch()} />;

  return (
    <div style={{ paddingBottom: '6rem' }}>
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
                {isAdmin && (
                  <th style={{ padding: '0.75rem 1rem', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      ref={headerCheckboxRef}
                      checked={isAllSelected}
                      onChange={handleToggleAll}
                      aria-label="Select all departments"
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                )}
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => {
                const isSelected = selectedIds.has(dept.id);
                return (
                  <tr
                    key={dept.id}
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
                          onChange={() => handleToggleRow(dept.id)}
                          aria-label={`Select department ${dept.name}`}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                    )}
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
          entityName={selectedIds.size === 1 ? 'department' : 'departments'}
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
          title={`${bulkAction?.type === 'ACTIVE' ? 'Activate' : 'Deactivate'} Departments`}
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: 0 }}>
                Are you sure you want to {bulkAction?.type === 'ACTIVE' ? 'activate' : 'deactivate'}{' '}
                <strong>{selectedIds.size}</strong> selected department(s)?
              </p>
              {bulkAction?.type === 'INACTIVE' && (
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>
                  Note: A department cannot be deactivated if it still contains active teams or employees.
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

