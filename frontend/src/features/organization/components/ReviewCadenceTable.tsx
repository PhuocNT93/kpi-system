import { useState } from 'react';
import { useReviewCadences, useDeleteReviewCadence } from '../hooks/useReviewCadences';
import { useAuth } from '../../../shared/auth/auth-context';
import { ReviewCadenceFormModal } from './ReviewCadenceFormModal';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge, ConfirmDialog } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgReviewCadence } from '../domain/organization-models';
import { Star } from 'lucide-react';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

export function ReviewCadenceTable() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';

  const cadencesQuery = useReviewCadences();
  const deleteMutation = useDeleteReviewCadence();

  const [editingCadence, setEditingCadence] = useState<OrgReviewCadence | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingCadence, setDeletingCadence] = useState<OrgReviewCadence | null>(null);

  const cadences = cadencesQuery.data ?? [];

  const handleDeleteConfirm = async () => {
    if (!deletingCadence) return;
    try {
      await deleteMutation.mutateAsync(deletingCadence.id);
      setDeletingCadence(null);
    } catch {
      // Mutation error captured in deleteMutation.error and shown in dialog
    }
  };

  const handleDeleteCancel = () => {
    deleteMutation.reset();
    setDeletingCadence(null);
  };

  if (cadencesQuery.isPending) return <LoadingSpinner label="Loading review cadences..." />;
  if (cadencesQuery.isError) return <ErrorAlert error={cadencesQuery.error} onRetry={() => cadencesQuery.refetch()} />;

  const thStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: isDark ? '#cbd5e1' : '#4b5563',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: isDark ? '#f8fafc' : '#111827',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button id="create-cadence-btn" onClick={() => setIsCreateOpen(true)} size="sm">
            {t('btn_create_cadence', '+ Create Cadence')}
          </Button>
        </div>
      )}

      {cadences.length === 0 ? (
        <EmptyState message={t('empty_cadences', 'No review cadences found.')} />
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  borderBottom: `2px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                }}
              >
                <th style={thStyle}>{t('col_code', 'Code')}</th>
                <th style={thStyle}>{t('col_name', 'Name')}</th>
                <th style={thStyle}>{t('col_interval', 'Interval')}</th>
                <th style={thStyle}>{t('col_system_default', 'System Default')}</th>
                <th style={thStyle}>{t('col_status', 'Status')}</th>
                {isAdmin && <th style={{ ...thStyle, width: '150px' }}>{t('col_actions', 'Actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {cadences.map((cadence) => (
                <tr
                  key={cadence.id}
                  style={{
                    borderBottom: `1px solid ${isDark ? '#334155' : '#f3f4f6'}`,
                    transition: 'background-color 0.15s',
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: 600, color: isDark ? '#93c5fd' : '#1d4ed8' }}>{cadence.code}</td>
                  <td style={tdStyle}>{cadence.name}</td>
                  <td style={tdStyle}>
                    {cadence.intervalMonths} {cadence.intervalMonths === 1 ? t('month', 'month') : t('months', 'months')}
                  </td>
                  <td style={tdStyle}>
                    {cadence.isSystemDefault ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
                          color: isDark ? '#6ee7b7' : '#065f46',
                          border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.4)' : '#a7f3d0'}`,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <Star size={12} fill={isDark ? '#34d399' : '#059669'} /> {t('system_default_badge', 'Default')}
                      </span>
                    ) : (
                      <span style={{ color: isDark ? '#64748b' : '#9ca3af', fontSize: '0.875rem' }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge status={cadence.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="outlined"
                        size="sm"
                        aria-label={`Edit cadence ${cadence.name}`}
                        onClick={() => setEditingCadence(cadence)}
                      >
                        {t('btn_edit', 'Edit')}
                      </Button>
                      <Button
                        variant="outlined"
                        size="sm"
                        style={{
                          color: isDark ? '#f87171' : '#dc2626',
                          borderColor: isDark ? '#7f1d1d' : '#fca5a5',
                          backgroundColor: isDark ? 'rgba(185, 28, 28, 0.1)' : undefined,
                        }}
                        aria-label={`Delete cadence ${cadence.name}`}
                        onClick={() => {
                          deleteMutation.reset();
                          setDeletingCadence(cadence);
                        }}
                      >
                        {t('btn_delete', 'Delete')}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isAdmin && (
        <ConfirmDialog
          isOpen={deletingCadence !== null}
          title={t('delete_confirm_title', 'Delete Review Cadence')}
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: 0, color: isDark ? '#f8fafc' : '#111827' }}>
                Are you sure you want to delete cadence <strong>{deletingCadence?.name}</strong>?
              </p>
              {deletingCadence?.isSystemDefault && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8125rem',
                    color: isDark ? '#fcd34d' : '#b45309',
                    backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#fef3c7',
                    padding: '0.5rem',
                    borderRadius: '4px',
                  }}
                >
                  Warning: This cadence is marked as the System Default.
                </p>
              )}
              {deleteMutation.isError && <ErrorAlert error={deleteMutation.error} />}
            </div>
          }
          confirmLabel={t('btn_delete', 'Delete')}
          isPending={deleteMutation.isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {/* Create Dialog */}
      {isAdmin && (
        <ReviewCadenceFormModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {/* Edit Dialog */}
      {isAdmin && (
        <ReviewCadenceFormModal
          isOpen={editingCadence !== undefined}
          cadence={editingCadence}
          onClose={() => setEditingCadence(undefined)}
        />
      )}
    </div>
  );
}
