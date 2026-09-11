import type { Kpi } from '../api/kpi-api';
import { useActivateKpiMutation, useDeactivateKpiMutation } from '../api/use-kpi';
import { StatusBadge } from '../../../shared/components/ui';

interface Props {
  kpis: Kpi[];
  onEdit: (kpi: Kpi) => void;
  onSelect?: (kpi: Kpi) => void;
  selectedKpiId?: string | null;
}

export function KpiTable({ kpis, onEdit, onSelect, selectedKpiId }: Props) {
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
      alert(err instanceof Error ? err.message : 'Failed to change KPI status');
    }
  };

  const isPending = activateMutation.isPending || deactivateMutation.isPending;

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <tr>
            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '0.875rem', color: '#374151' }}>
          {kpis.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No KPIs found. Create your first KPI.
              </td>
            </tr>
          )}
          {kpis.map((kpi) => {
            const isActive = kpi.active !== false;
            return (
              <tr 
                key={kpi.kpiId} 
                style={{ 
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: selectedKpiId === kpi.kpiId ? '#eff6ff' : 'transparent',
                  cursor: onSelect ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                  opacity: isActive ? 1 : 0.65,
                }}
                onClick={() => onSelect && onSelect(kpi)}
              >
                <td style={{ padding: '1rem', fontWeight: 600, fontFamily: 'monospace', color: '#4f46e5' }}>{kpi.code}</td>
                <td style={{ padding: '1rem', fontWeight: 500 }}>{kpi.name}</td>
                <td style={{ padding: '1rem', color: '#6b7280', maxWidth: 300 }}>
                  {kpi.description || <span style={{ fontStyle: 'italic' }}>—</span>}
                </td>
                <td style={{ padding: '1rem' }}>
                  <StatusBadge status={isActive ? 'ACTIVE' : 'INACTIVE'} />
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(kpi); }}
                      style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => handleToggleActive(e, kpi)}
                      disabled={isPending}
                      title={isActive ? 'Deactivate KPI (cannot delete)' : 'Activate KPI'}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 4,
                        border: `1px solid ${isActive ? '#fecaca' : '#bbf7d0'}`,
                        backgroundColor: isActive ? '#fef2f2' : '#f0fdf4',
                        color: isActive ? '#dc2626' : '#16a34a',
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      {isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
