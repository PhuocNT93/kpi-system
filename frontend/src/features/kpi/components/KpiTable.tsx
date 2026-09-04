import { useState } from 'react';
import type { Kpi } from '../api/kpi-api';
import { useDeleteKpiMutation } from '../api/use-kpi';

interface Props {
  kpis: Kpi[];
  onEdit: (kpi: Kpi) => void;
  onSelect?: (kpi: Kpi) => void;
  selectedKpiId?: string | null;
  onDeleteSuccess?: (id: string) => void;
}

export function KpiTable({ kpis, onEdit, onSelect, selectedKpiId, onDeleteSuccess }: Props) {
  const deleteMutation = useDeleteKpiMutation();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      if (onDeleteSuccess) {
        onDeleteSuccess(id);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete KPI');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <tr>
            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '0.875rem', color: '#374151' }}>
          {kpis.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No KPIs found. Create your first KPI.
              </td>
            </tr>
          )}
          {kpis.map((kpi) => (
            <tr 
              key={kpi.kpiId} 
              style={{ 
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: selectedKpiId === kpi.kpiId ? '#eff6ff' : 'transparent',
                cursor: onSelect ? 'pointer' : 'default',
                transition: 'background-color 0.2s'
              }}
              onClick={() => onSelect && onSelect(kpi)}
            >
              <td style={{ padding: '1rem', fontWeight: 600, fontFamily: 'monospace', color: '#4f46e5' }}>{kpi.code}</td>
              <td style={{ padding: '1rem', fontWeight: 500 }}>{kpi.name}</td>
              <td style={{ padding: '1rem', color: '#6b7280', maxWidth: 300 }}>
                {kpi.description || <span style={{ fontStyle: 'italic' }}>—</span>}
              </td>
              <td style={{ padding: '1rem' }}>
                {confirmDeleteId === kpi.kpiId ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: '0.8rem', color: '#dc2626', alignSelf: 'center' }}>Delete?</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(kpi.kpiId); }}
                      disabled={deleteMutation.isPending}
                      style={{ padding: '4px 10px', borderRadius: 4, border: 'none', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      {deleteMutation.isPending ? '...' : 'Yes'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                      style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(kpi); }}
                      style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(kpi.kpiId); }}
                      style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #fecaca', backgroundColor: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
