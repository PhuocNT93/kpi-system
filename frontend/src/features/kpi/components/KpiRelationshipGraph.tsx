import { useKpiRelationships, useKpis, useCreateKpiRelationship } from '../api/kpi-api';
import { useState } from 'react';

export function KpiRelationshipGraph() {
  const { data: kpis } = useKpis();
  const { data: relationships, isLoading } = useKpiRelationships();
  const createMutation = useCreateKpiRelationship();

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [type, setType] = useState('DEPENDS_ON');

  if (isLoading) return <div>Loading graph...</div>;

  const handleAddEdge = async () => {
    if (!sourceId || !targetId) return;
    try {
      await createMutation.mutateAsync({
        sourceKpiId: sourceId,
        targetKpiId: targetId,
        relationshipType: type,
      });
      alert('Relationship created');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error creating relationship (possible cycle)');
    }
  };

  return (
    <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>KPI Relationships (DAG)</h3>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="">Select Source KPI...</option>
          {kpis?.map((k: any) => <option key={k.kpiId} value={k.kpiId}>{k.code}</option>)}
        </select>
        
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="DEPENDS_ON">DEPENDS ON</option>
          <option value="SUPPORTS">SUPPORTS</option>
        </select>

        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="">Select Target KPI...</option>
          {kpis?.map((k: any) => <option key={k.kpiId} value={k.kpiId}>{k.code}</option>)}
        </select>

        <button onClick={handleAddEdge} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Add Edge
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: '#f9fafb', padding: '1rem', border: '1px dashed #ccc' }}>
        {relationships?.length === 0 && <div style={{ color: '#666' }}>No relationships defined.</div>}
        {relationships?.map((rel: any) => {
          const src = kpis?.find((k: any) => k.kpiId === rel.sourceKpiId)?.code || rel.sourceKpiId;
          const tgt = kpis?.find((k: any) => k.kpiId === rel.targetKpiId)?.code || rel.targetKpiId;
          return (
            <div key={rel.relationshipId} style={{ padding: '0.5rem', background: '#fff', border: '1px solid #e5e7eb', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontWeight: 'bold' }}>{src}</span>
              <span style={{ background: '#dbeafe', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#1d4ed8' }}>{rel.relationshipType}</span>
              <span style={{ fontWeight: 'bold' }}>{tgt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
