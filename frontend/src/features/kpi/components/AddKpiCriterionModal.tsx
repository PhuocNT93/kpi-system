import { useState } from 'react';
import { useAddKpiCriterionMutation } from '../api/use-kpi';
import { useCriteriaQuery } from '../../criteria/api/use-criteria';
import { LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';

interface Props {
  kpiId: string;
  onClose: () => void;
}

export function AddKpiCriterionModal({ kpiId, onClose }: Props) {
  const [selectedCriterionId, setSelectedCriterionId] = useState('');
  const [weight, setWeight] = useState('10');
  
  const { data: criteriaResponse, isLoading, error } = useCriteriaQuery();
  const criteria = criteriaResponse ?? [];

  const addMutation = useAddKpiCriterionMutation(kpiId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCriterionId) return;

    try {
      await addMutation.mutateAsync({
        criterionId: selectedCriterionId,
        weight: parseFloat(weight)
      });
      onClose();
    } catch {
      // Error is handled by mutation/ErrorBoundary or could be displayed here
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 8, width: 400, maxWidth: '90%' }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem' }}>Add Criterion to KPI</h2>
        
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorAlert error={error} />
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {addMutation.isError && <ErrorAlert error={addMutation.error} />}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Select Criterion</label>
              <select
                value={selectedCriterionId}
                onChange={(e) => setSelectedCriterionId(e.target.value)}
                required
                style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #d1d5db' }}
              >
                <option value="" disabled>-- Select a criterion --</option>
                {criteria.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Weight (%)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
                min="0"
                max="100"
                step="0.1"
                style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #d1d5db' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                How much this criterion contributes to the KPI score.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending || !selectedCriterionId}>
                {addMutation.isPending ? 'Adding...' : 'Add Criterion'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
