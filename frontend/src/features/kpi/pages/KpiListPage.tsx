import { useState } from 'react';
import { useKpis, useCreateKpi, useUpdateKpi, useDeleteKpi } from '../api/kpi-api';
import { LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import { KpiRelationshipGraph } from '../components/KpiRelationshipGraph';
import { KpiFormModal } from '../components/KpiFormModal';
import type { KpiFormData } from '../components/KpiFormModal';
import type { Kpi } from '../api/kpi-api';

export function KpiListPage() {
  const { data: kpis, isLoading, error } = useKpis();
  const createMutation = useCreateKpi();
  const updateMutation = useUpdateKpi();
  const deleteMutation = useDeleteKpi();

  const [isGraphView, setIsGraphView] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<KpiFormData | null>(null);

  const handleOpenCreate = () => {
    setSelectedKpi(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (kpi: Kpi) => {
    setSelectedKpi({
      kpiId: kpi.kpiId,
      code: kpi.code,
      name: kpi.name,
      description: kpi.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: KpiFormData) => {
    if (data.kpiId) {
      await updateMutation.mutateAsync({
        kpiId: data.kpiId,
        data: {
          name: data.name,
          description: data.description,
        },
      });
    } else {
      await createMutation.mutateAsync({
        code: data.code,
        name: data.name,
        description: data.description,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this KPI?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading KPIs..." />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
            KPI Catalog
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Manage the central repository of Key Performance Indicators.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button onClick={() => setIsGraphView(!isGraphView)} variant="secondary">
            {isGraphView ? 'List View' : 'Graph View'}
          </Button>
          <Button onClick={handleOpenCreate}>
            + Create KPI
          </Button>
        </div>
      </div>

      {isGraphView ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', height: '600px' }}>
          <KpiRelationshipGraph />
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Description</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {kpis?.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                    No KPIs found. Create one to get started.
                  </td>
                </tr>
              )}
              {kpis?.map((kpi: any) => (
                <tr key={kpi.kpiId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                    {kpi.code}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                    {kpi.name}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                    {kpi.description || '-'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleOpenEdit(kpi)}
                      style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', marginRight: '1rem' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(kpi.kpiId)}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <KpiFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={selectedKpi}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
