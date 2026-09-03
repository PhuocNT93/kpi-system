import { useState } from 'react';
import { 
  useKpiCriteriaQuery, 
  useUpdateKpiCriterionWeightMutation,
  useRemoveKpiCriterionMutation 
} from '../api/use-kpi';
import type { Kpi } from '../api/kpi-api';
import { LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import { AddKpiCriterionModal } from './AddKpiCriterionModal';

interface Props {
  kpi: Kpi;
}

export function KpiCriteriaPanel({ kpi }: Props) {
  const { data: criteria, isLoading, error } = useKpiCriteriaQuery(kpi.kpiId);
  const updateMutation = useUpdateKpiCriterionWeightMutation(kpi.kpiId);
  const removeMutation = useRemoveKpiCriterionMutation(kpi.kpiId);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState<string>('');

  if (isLoading) return <div style={{ padding: '1rem' }}><LoadingSpinner /></div>;
  if (error) return <div style={{ padding: '1rem' }}><ErrorAlert error={error} /></div>;

  const handleEditClick = (mappingId: string, currentWeight: number) => {
    setEditingMappingId(mappingId);
    setEditWeight(currentWeight.toString());
  };

  const handleSaveWeight = async (mappingId: string) => {
    const weight = parseFloat(editWeight);
    if (!isNaN(weight)) {
      await updateMutation.mutateAsync({ mappingId, dto: { weight } });
    }
    setEditingMappingId(null);
  };

  const handleRemove = async (mappingId: string) => {
    if (confirm('Are you sure you want to remove this criterion from the KPI?')) {
      await removeMutation.mutateAsync(mappingId);
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#374151' }}>
          Mapped Criteria for <span style={{ color: '#4f46e5' }}>{kpi.code}</span>
        </h3>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
          + Add Criterion
        </Button>
      </div>

      {(!criteria || criteria.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#fff', borderRadius: 8, border: '1px dashed #d1d5db' }}>
          <p style={{ color: '#6b7280', margin: 0 }}>No criteria mapped yet. Add criteria to define how this KPI is measured.</p>
        </div>
      ) : (
        <table style={{ width: '100%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
          <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Weight (%)</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((c) => (
              <tr key={c.kpiCriterionId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 500, fontFamily: 'monospace' }}>{c.criterionCode}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{c.criterionName}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {editingMappingId === c.kpiCriterionId ? (
                    <input
                      type="number"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      style={{ width: 60, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db' }}
                      min="0" max="100"
                    />
                  ) : (
                    <span>{c.weight}%</span>
                  )}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  {editingMappingId === c.kpiCriterionId ? (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button size="sm" onClick={() => handleSaveWeight(c.kpiCriterionId)} disabled={updateMutation.isPending}>Save</Button>
                      <button onClick={() => setEditingMappingId(null)} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEditClick(c.kpiCriterionId, c.weight)} style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleRemove(c.kpiCriterionId)} style={{ padding: '4px 8px', border: '1px solid #fecaca', borderRadius: 4, background: '#fff', color: '#dc2626', cursor: 'pointer' }} disabled={removeMutation.isPending}>Remove</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isAddModalOpen && (
        <AddKpiCriterionModal
          kpiId={kpi.kpiId}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
}
