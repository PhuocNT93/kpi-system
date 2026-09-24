import { useState } from 'react';
import {
  useCriteriaQuery,
  useCreateCriterionMutation,
  useActivateCriterionMutation,
  useDeactivateCriterionMutation,
} from '../api/use-criteria';
import { StatusBadge, LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import { CreateCriterionModal } from '../components/CreateCriterionModal';
import { useTheme } from '../../../shared/theme';
import { useUiTranslation } from '../../../shared/i18n/ui-i18n';

export function CriteriaPage() {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const { data: criteria, isLoading, error } = useCriteriaQuery(searchTerm, categoryFilter);

  const createMutation = useCreateCriterionMutation();
  const activateMutation = useActivateCriterionMutation();
  const deactivateMutation = useDeactivateCriterionMutation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreate = async (data: Parameters<typeof createMutation.mutateAsync>[0]) => {
    await createMutation.mutateAsync(data);
    setIsCreateModalOpen(false);
  };

  const handleToggleStatus = async (criterionId: string, currentStatus: string) => {
    if (currentStatus === 'ACTIVE') {
      await deactivateMutation.mutateAsync(criterionId);
    } else {
      await activateMutation.mutateAsync(criterionId);
    }
  };

  if (isLoading) return <LoadingSpinner label={t('loading_criteria', 'Loading criteria...')} />;
  if (error) return <ErrorAlert error={error} />;

  const availableCategories = Array.from(
    new Set([
      'PERFORMANCE',
      'CAPABILITY',
      'CONTRIBUTION',
      'BEHAVIOR',
      ...(criteria?.map((c) => c.category) || []),
    ])
  );

  return (
    <div style={{ padding: 'clamp(1rem, 2vw, 2rem)', width: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)', fontWeight: 800, color: isDark ? '#f8fafc' : '#111827' }}>
            {t('criteria_library_title', 'Criteria & Rules Library')}
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: isDark ? '#94a3b8' : '#6b7280', fontSize: '0.875rem' }}>
            {t('criteria_library_desc', 'Manage individual criteria blocks and scoring rules used in evaluation templates.')}
          </p>
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)} disabled={createMutation.isPending}>
          {createMutation.isPending ? t('creating', 'Creating...') : t('create_criterion', '+ Create Criterion')}
        </Button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder={t('search_criteria_placeholder', 'Search by code or name...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            color: isDark ? '#f8fafc' : '#111827',
            outline: 'none',
          }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            width: 220,
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            color: isDark ? '#f8fafc' : '#111827',
            outline: 'none',
          }}
        >
          <option value="">{t('all_categories', 'All Categories')}</option>
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          backgroundColor: isDark ? '#111827' : '#fff',
          borderRadius: 8,
          border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: isDark ? '#1e293b' : '#f9fafb', borderBottom: `1px solid ${isDark ? '#334155' : '#e5e7eb'}` }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', textTransform: 'uppercase' }}>{t('kpi_col_code', 'Code')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', textTransform: 'uppercase' }}>{t('kpi_col_name', 'Name')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', textTransform: 'uppercase' }}>{t('criterion_category', 'Category')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', textTransform: 'uppercase' }}>{t('current_version', 'Current Version')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', textTransform: 'uppercase' }}>{t('kpi_col_status', 'Status')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>{t('kpi_col_actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem', color: isDark ? '#f8fafc' : '#374151' }}>
              {criteria?.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: isDark ? '#94a3b8' : '#6b7280' }}>
                    {t('no_criteria_found', 'No criteria found.')}
                  </td>
                </tr>
              )}
              {criteria?.map((criterion) => {
                const versionNum =
                  criterion.currentVersion?.versionNo ??
                  (criterion as unknown as { current_version?: { version_no?: number } })
                    .current_version?.version_no;
                const categoryColorMap: Record<string, { bg: string; text: string }> = {
                  PERFORMANCE: { bg: isDark ? 'rgba(56, 189, 248, 0.2)' : '#e0f2fe', text: isDark ? '#7dd3fc' : '#0369a1' },
                  CAPABILITY: { bg: isDark ? 'rgba(129, 140, 248, 0.2)' : '#e0e7ff', text: isDark ? '#a5b4fc' : '#3730a3' },
                  CONTRIBUTION: { bg: isDark ? 'rgba(251, 191, 36, 0.2)' : '#fef3c7', text: isDark ? '#fde047' : '#92400e' },
                  BEHAVIOR: { bg: isDark ? 'rgba(192, 132, 252, 0.2)' : '#f3e8ff', text: isDark ? '#d8b4fe' : '#7e22ce' },
                };
                const colors = categoryColorMap[criterion.category] || {
                  bg: isDark ? '#1e293b' : '#f3f4f6',
                  text: isDark ? '#cbd5e1' : '#374151',
                };

                const isActive = criterion.status === 'ACTIVE';
                const isPendingAction =
                  activateMutation.isPending || deactivateMutation.isPending;

                return (
                  <tr key={criterion.id} style={{ borderBottom: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}>
                    <td style={{ padding: '1rem', fontWeight: 500, fontFamily: 'monospace', color: isDark ? '#818cf8' : '#4f46e5' }}>{criterion.code}</td>
                    <td style={{ padding: '1rem', color: isDark ? '#f8fafc' : '#111827' }}>{criterion.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '2px 8px',
                          borderRadius: 999,
                          backgroundColor: colors.bg,
                          color: colors.text,
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                      >
                        {criterion.category}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: isDark ? '#cbd5e1' : '#4b5563' }}>{versionNum ? `v${versionNum}` : '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <StatusBadge status={criterion.status} />
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(criterion.id, criterion.status)}
                        disabled={isPendingAction}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: `1px solid ${isActive ? (isDark ? '#7f1d1d' : '#fecaca') : (isDark ? '#14532d' : '#bbf7d0')}`,
                          backgroundColor: isActive ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2') : (isDark ? 'rgba(34, 197, 94, 0.2)' : '#f0fdf4'),
                          color: isActive ? (isDark ? '#f87171' : '#dc2626') : (isDark ? '#4ade80' : '#16a34a'),
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: isPendingAction ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isActive ? t('deactivate', 'Deactivate') : t('activate', 'Activate')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CreateCriterionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
