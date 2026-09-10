import { useState, useRef, useEffect } from 'react';
import { useJobLevels, useBulkUpdateJobLevels } from '../hooks/useJobLevels';
import { useAuth } from '../../../shared/auth/auth-context';
import { JobLevelFormModal } from './JobLevelFormModal';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge, ConfirmDialog } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgJobLevel } from '../domain/organization-models';
import { BulkActionBar } from './BulkActionBar';

export function JobLevelTable() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  
  const levelsQuery = useJobLevels();
  const [editingLevel, setEditingLevel] = useState<OrgJobLevel | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ type: 'ACTIVE' | 'INACTIVE'; isOpen: boolean } | null>(null);
  const bulkUpdateMutation = useBulkUpdateJobLevels();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const levels = levelsQuery.data ?? [];

  const isAllSelected = levels.length > 0 && selectedIds.size === levels.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < levels.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(levels.map((l) => l.id)));
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
        levelIds: Array.from(selectedIds),
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

  if (levelsQuery.isPending) return <LoadingSpinner label="Loading job levels..." />;
  if (levelsQuery.isError) return <ErrorAlert error={levelsQuery.error} onRetry={() => levelsQuery.refetch()} />;

  return (
    <div style={{ paddingBottom: '6rem' }}>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Button id="create-level-btn" onClick={() => setIsCreateOpen(true)} size="sm">
            + Create Level
          </Button>
        </div>
      )}

      {levels.length === 0 ? (
        <EmptyState message="No job levels found." />
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
                      aria-label="Select all job levels"
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                )}
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {levels.map((level) => {
                const isSelected = selectedIds.has(level.id);
                return (
                  <tr
                    key={level.id}
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
                          onChange={() => handleToggleRow(level.id)}
                          aria-label={`Select job level ${level.name}`}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                    )}
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{level.code}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{level.name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{level.rank}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <StatusBadge status={level.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <Button
                          variant="outlined"
                          size="sm"
                          aria-label={`Edit job level ${level.name}`}
                          onClick={() => setEditingLevel(level)}
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
          entityName={selectedIds.size === 1 ? 'job level' : 'job levels'}
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
          title={`${bulkAction?.type === 'ACTIVE' ? 'Activate' : 'Deactivate'} Job Levels`}
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: 0 }}>
                Are you sure you want to {bulkAction?.type === 'ACTIVE' ? 'activate' : 'deactivate'}{' '}
                <strong>{selectedIds.size}</strong> selected job level(s)?
              </p>
              {bulkAction?.type === 'INACTIVE' && (
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>
                  Note: A job level cannot be deactivated if it still contains active employees.
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
        <JobLevelFormModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {/* Edit Dialog */}
      {isAdmin && (
        <JobLevelFormModal
          isOpen={editingLevel !== undefined}
          level={editingLevel}
          onClose={() => setEditingLevel(undefined)}
        />
      )}
    </div>
  );
}

