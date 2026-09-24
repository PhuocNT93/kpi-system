import type { Kpi } from '../api/kpi-api';
import { useActivateKpiMutation, useDeactivateKpiMutation } from '../api/use-kpi';
import { StatusBadge } from '../../../shared/components/ui';
import { useTheme } from '../../../shared/theme';
import { useUiTranslation } from '../../../shared/i18n/ui-i18n';

interface Props {
  kpis: Kpi[];
  onEdit: (kpi: Kpi) => void;
  onSelect?: (kpi: Kpi) => void;
  selectedKpiId?: string | null;
}

export function KpiTable({ kpis, onEdit, onSelect, selectedKpiId }: Props) {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const activateMutation = useActivateKpiMutation();
  const deactivateMutation = useDeactivateKpiMutation();

  const handleToggleActive = async (e: React.MouseEvent, kpi: Kpi) => {
    e.stopPropagation();
    try {
      if (kpi.active) {
        await deactivateMutation.mutateAsync(kpi.kpiId);
      } else {
        await activateMutation.mutateAsync(kpi.kpiId);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('failed_toggle_kpi', 'Failed to change KPI status'));
    }
  };

  const isPending = activateMutation.isPending || deactivateMutation.isPending;

  return (
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
        <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: isDark ? '#1e293b' : '#f9fafb', borderBottom: `1px solid ${isDark ? '#334155' : '#e5e7eb'}` }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', textTransform: 'uppercase' }}>{t('kpi_col_code', 'Code')}</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', textTransform: 'uppercase' }}>{t('kpi_col_name', 'Name')}</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', textTransform: 'uppercase' }}>{t('kpi_col_description', 'Description')}</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', textTransform: 'uppercase' }}>{t('kpi_col_status', 'Status')}</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', textTransform: 'uppercase' }}>{t('kpi_col_actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.875rem', color: isDark ? '#f8fafc' : '#374151' }}>
            {kpis.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: isDark ? '#94a3b8' : '#6b7280' }}>
                  {t('no_kpis_found', 'No KPIs found. Create your first KPI.')}
                </td>
              </tr>
            )}
            {kpis.map((kpi) => {
              const isActive = kpi.active !== false;
              return (
                <tr 
                  key={kpi.kpiId} 
                  style={{ 
                    borderBottom: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                    backgroundColor: selectedKpiId === kpi.kpiId ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff') : 'transparent',
                    cursor: onSelect ? 'pointer' : 'default',
                    transition: 'background-color 0.2s',
                  opacity: isActive ? 1 : 0.65,
                }}
                onClick={() => onSelect && onSelect(kpi)}
              >
                <td style={{ padding: '1rem', fontWeight: 600, fontFamily: 'monospace', color: isDark ? '#818cf8' : '#4f46e5' }}>{kpi.code}</td>
                <td style={{ padding: '1rem', fontWeight: 500, color: isDark ? '#f8fafc' : '#111827' }}>{kpi.name}</td>
                <td style={{ padding: '1rem', color: isDark ? '#94a3b8' : '#6b7280', maxWidth: 300 }}>
                  {kpi.description || <span style={{ fontStyle: 'italic' }}>—</span>}
                </td>
                <td style={{ padding: '1rem' }}>
                  <StatusBadge status={isActive ? 'ACTIVE' : 'INACTIVE'} />
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(kpi); }}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 4,
                        border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
                        backgroundColor: isDark ? '#1f2937' : '#fff',
                        color: isDark ? '#f8fafc' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      {t('edit', 'Edit')}
                    </button>
                    <button
                      onClick={(e) => handleToggleActive(e, kpi)}
                      disabled={isPending}
                      title={isActive ? t('deactivate_kpi_title', 'Deactivate KPI (cannot delete)') : t('activate_kpi_title', 'Activate KPI')}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 4,
                        border: `1px solid ${isActive ? (isDark ? '#7f1d1d' : '#fecaca') : (isDark ? '#14532d' : '#bbf7d0')}`,
                        backgroundColor: isActive ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2') : (isDark ? 'rgba(34, 197, 94, 0.2)' : '#f0fdf4'),
                        color: isActive ? (isDark ? '#f87171' : '#dc2626') : (isDark ? '#4ade80' : '#16a34a'),
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      {isActive ? t('deactivate', 'Deactivate') : t('activate', 'Activate')}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
  );
}
