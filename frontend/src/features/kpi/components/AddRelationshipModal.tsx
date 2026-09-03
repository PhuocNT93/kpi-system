import { useState } from 'react';
import type { Kpi, KpiRelationship } from '../api/kpi-api';
import { useCreateRelationshipMutation } from '../api/use-kpi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  kpis: Kpi[];
}

const RELATIONSHIP_TYPES: KpiRelationship['relationshipType'][] = [
  'DEPENDS_ON', 'SUPPORTS', 'INFLUENCES', 'BLOCKS', 'PREREQUISITE_FOR',
];

export function AddRelationshipModal({ isOpen, onClose, kpis }: Props) {
  const [sourceKpiId, setSourceKpiId] = useState('');
  const [targetKpiId, setTargetKpiId] = useState('');
  const [relationshipType, setRelationshipType] = useState<KpiRelationship['relationshipType']>('DEPENDS_ON');
  const [error, setError] = useState('');

  const createMutation = useCreateRelationshipMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (sourceKpiId === targetKpiId) {
      setError('Source and target KPI must be different.');
      return;
    }
    try {
      await createMutation.mutateAsync({ sourceKpiId, targetKpiId, relationshipType });
      setSourceKpiId('');
      setTargetKpiId('');
      setRelationshipType('DEPENDS_ON');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create relationship. A circular dependency may have been detected.');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: 12, padding: '2rem',
        width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
          Add KPI Relationship
        </h2>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: '1rem', color: '#dc2626', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.875rem', fontWeight: 500 }}>
              Source KPI <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={sourceKpiId}
              onChange={(e) => setSourceKpiId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="">Select source KPI...</option>
              {kpis.map((k) => (
                <option key={k.kpiId} value={k.kpiId}>{k.code} — {k.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.875rem', fontWeight: 500 }}>
              Relationship Type <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as KpiRelationship['relationshipType'])}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
            >
              {RELATIONSHIP_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.875rem', fontWeight: 500 }}>
              Target KPI <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={targetKpiId}
              onChange={(e) => setTargetKpiId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="">Select target KPI...</option>
              {kpis.map((k) => (
                <option key={k.kpiId} value={k.kpiId}>{k.code} — {k.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !sourceKpiId || !targetKpiId}
              style={{ padding: '8px 20px', borderRadius: 6, border: 'none', backgroundColor: '#4f46e5', color: '#fff', cursor: createMutation.isPending ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: createMutation.isPending ? 0.7 : 1 }}
            >
              {createMutation.isPending ? 'Adding...' : 'Add Relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
