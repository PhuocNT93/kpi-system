import type { KpiRelationship, Kpi } from '../api/kpi-api';
import { useDeleteRelationshipMutation } from '../api/use-kpi';

const RELATIONSHIP_LABELS: Record<KpiRelationship['relationshipType'], string> = {
  DEPENDS_ON: 'Depends On',
  SUPPORTS: 'Supports',
  INFLUENCES: 'Influences',
  BLOCKS: 'Blocks',
  PREREQUISITE_FOR: 'Prerequisite For',
};

const RELATIONSHIP_COLORS: Record<KpiRelationship['relationshipType'], string> = {
  DEPENDS_ON: '#e0e7ff',
  SUPPORTS: '#dcfce7',
  INFLUENCES: '#fef9c3',
  BLOCKS: '#fee2e2',
  PREREQUISITE_FOR: '#f3e8ff',
};

interface Props {
  relationships: KpiRelationship[];
  kpisById: Map<string, Kpi>;
  onAddRelationship: () => void;
}

export function KpiRelationshipTable({ relationships, kpisById, onAddRelationship }: Props) {
  const deleteMutation = useDeleteRelationshipMutation();

  const getKpiLabel = (id: string) => {
    const kpi = kpisById.get(id);
    return kpi ? `${kpi.code} — ${kpi.name}` : id;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>KPI Dependency Map</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
            Circular dependencies are automatically prevented by the system.
          </p>
        </div>
        <button
          onClick={onAddRelationship}
          style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#4f46e5', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
        >
          + Add Relationship
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Source KPI</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Relationship</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Target KPI</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.875rem', color: '#374151' }}>
            {relationships.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No relationships defined. Add one above.
                </td>
              </tr>
            )}
            {relationships.map((rel) => (
              <tr key={rel.relationshipId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 500 }}>
                  {getKpiLabel(rel.sourceKpiId)}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{
                    display: 'inline-flex', padding: '2px 8px', borderRadius: 999,
                    backgroundColor: RELATIONSHIP_COLORS[rel.relationshipType],
                    fontSize: '0.75rem', fontWeight: 600
                  }}>
                    {RELATIONSHIP_LABELS[rel.relationshipType]}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 500 }}>
                  {getKpiLabel(rel.targetKpiId)}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <button
                    onClick={() => deleteMutation.mutateAsync(rel.relationshipId)}
                    disabled={deleteMutation.isPending}
                    style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #fecaca', backgroundColor: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
