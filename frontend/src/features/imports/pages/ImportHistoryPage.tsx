import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getImportHistory } from '../api/import-api';
import { LoadingSpinner, ErrorAlert, EmptyState } from '@/shared/components/ui';
import { Button } from '@/shared/ui/Button/Button';
import { Badge } from '@/shared/ui/Badge/Badge';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Plus, Eye } from 'lucide-react';

export function ImportHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['imports', { page, pageSize }],
    queryFn: () => getImportHistory(page, pageSize),
    refetchInterval: (query) => {
      // Poll if any job on the page is running
      const hasRunningJobs = query.state.data?.items.some(
        job => ['UPLOADED', 'VALIDATING', 'PREVIEW', 'IMPORTING'].includes(job.status)
      );
      return hasRunningJobs ? 5000 : false;
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge variant="success">Completed</Badge>;
      case 'PARTIALLY_COMPLETED': return <Badge variant="secondary">Partial</Badge>;
      case 'FAILED': return <Badge variant="danger">Failed</Badge>;
      case 'IMPORTING': return <Badge variant="primary">Importing...</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading import history..." />;
  if (error) return <ErrorAlert error={error} onRetry={() => refetch()} />;

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontFamily: TYPOGRAPHY.fontFamily.headline, fontSize: TYPOGRAPHY.fontSize['2xl'] }}>
            Import History
          </h1>
          <p style={{ margin: 0, color: COLORS.neutral.textSecondary }}>
            View previous CSV evaluation imports and check their statuses.
          </p>
        </div>
        <Button onClick={() => navigate('/admin/imports/upload')} variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} />
          Upload CSV
        </Button>
      </div>

      <div style={{
        background: COLORS.neutral.white,
        border: `1px solid ${COLORS.neutral[200]}`,
        borderRadius: RADII.lg,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {items.length === 0 ? (
          <>
            <EmptyState 
              message="No imports yet. Upload your first CSV file to begin importing evaluation data." 
            />
            <div style={{ textAlign: 'center', marginTop: '-16px' }}>
              <Button onClick={() => navigate('/admin/imports/upload')}>Upload CSV</Button>
            </div>
          </>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
                <thead style={{ background: COLORS.neutral[50] }}>
                  <tr style={{ borderBottom: `2px solid ${COLORS.neutral[200]}` }}>
                    <th style={{ padding: '12px 16px' }}>File</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Rows</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Imported</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Errors</th>
                    <th style={{ padding: '12px 16px' }}>Created At</th>
                    <th style={{ padding: '12px 16px' }}>Completed At</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((job) => (
                    <tr key={job.import_job_id} style={{ borderBottom: `1px solid ${COLORS.neutral[100]}` }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{job.file_name}</td>
                      <td style={{ padding: '12px 16px' }}>{getStatusBadge(job.status)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{job.total_rows}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: COLORS.semantic.success[700] }}>{job.success_rows}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: job.error_rows > 0 ? COLORS.semantic.danger[700] : 'inherit' }}>{job.error_rows}</td>
                      <td style={{ padding: '12px 16px', color: COLORS.neutral.textSecondary }}>{new Date(job.started_at).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', color: COLORS.neutral.textSecondary }}>{job.finished_at ? new Date(job.finished_at).toLocaleString() : '-'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Button variant="outlined" onClick={() => navigate(`/admin/imports/${job.import_job_id}`)} style={{ padding: '4px 8px' }}>
                          <Eye size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
                Rows {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="outlined" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  &lt; Previous
                </Button>
                <div style={{ padding: '8px 12px', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 500 }}>
                  {page} / {totalPages}
                </div>
                <Button variant="outlined" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next &gt;
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
