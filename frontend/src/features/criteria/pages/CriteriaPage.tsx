import { useState } from 'react';
import { useCriteriaQuery, useCreateCriterionMutation } from '../api/use-criteria';
import { StatusBadge, LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import { CreateCriterionModal } from '../components/CreateCriterionModal';

export function CriteriaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const { data: criteria, isLoading, error } = useCriteriaQuery(searchTerm, categoryFilter);

  const createMutation = useCreateCriterionMutation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateSubmit = async (data: Record<string, unknown>) => {
    await createMutation.mutateAsync(data);
    setIsCreateModalOpen(false);
  };

  if (isLoading) return <LoadingSpinner label="Loading criteria..." />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
            Criteria & Rules Library
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Manage individual criteria blocks and scoring rules used in evaluation templates.
          </p>
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)} disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creating...' : '+ Create Criterion'}
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search by code or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            outline: 'none',
          }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            width: 200,
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            outline: 'none',
          }}
        >
          <option value="">All Categories</option>
          <option value="PERFORMANCE">Performance</option>
          <option value="BEHAVIOR">Behavior</option>
          <option value="CONTRIBUTION">Contribution</option>
        </select>
      </div>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Current Version</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.875rem', color: '#374151' }}>
            {criteria?.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No criteria found.
                </td>
              </tr>
            )}
            {criteria?.map((criterion) => (
              <tr key={criterion.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem', fontWeight: 500 }}>{criterion.code}</td>
                <td style={{ padding: '1rem' }}>{criterion.name}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    display: 'inline-flex', padding: '2px 8px', borderRadius: 999,
                    backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '0.75rem', fontWeight: 500
                  }}>
                    {criterion.category}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {criterion.currentVersion ? `v${criterion.currentVersion.versionNo}` : '-'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <StatusBadge status={criterion.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <CreateCriterionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
