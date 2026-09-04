import { useState } from 'react';
import { useJobLevels } from '../hooks/useJobLevels';
import { useAuth } from '../../../shared/auth/auth-context';
import { JobLevelFormModal } from './JobLevelFormModal';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgJobLevel } from '../domain/organization-models';

export function JobLevelTable() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  
  const levelsQuery = useJobLevels();
  const [editingLevel, setEditingLevel] = useState<OrgJobLevel | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (levelsQuery.isPending) return <LoadingSpinner label="Loading job levels..." />;
  if (levelsQuery.isError) return <ErrorAlert error={levelsQuery.error} onRetry={() => levelsQuery.refetch()} />;

  const levels = levelsQuery.data ?? [];

  return (
    <div>
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
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {levels.map((level) => (
                <tr key={level.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
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
              ))}
            </tbody>
          </table>
        </div>
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

