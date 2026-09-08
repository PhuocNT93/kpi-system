import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getImportRows, getImportStatus } from '../api/import-api';
import { LoadingSpinner, ErrorAlert, EmptyState } from '@/shared/components/ui';
import { Button } from '@/shared/ui/Button/Button';
import { Badge } from '@/shared/ui/Badge/Badge';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export function ImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const { data: jobStatus, isLoading: isJobLoading, error: jobError } = useQuery({
    queryKey: ['importJob', id],
    queryFn: () => getImportStatus(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.data.status;
      return (status === 'IMPORTING' || status === 'UPLOADED' || status === 'VALIDATING') ? 2000 : false;
    }
  });

  const { data: rowsData, isLoading: isRowsLoading, error: rowsError, refetch: refetchRows } = useQuery({
    queryKey: ['importRows', id, { page, pageSize }],
    queryFn: () => getImportRows(id!, page, pageSize),
    enabled: !!id,
    refetchInterval: () => {
      // Poll rows if job is importing, to see live progress
      const status = jobStatus?.data.status;
      return status === 'IMPORTING' ? 3000 : false;
    }
  });

  const isLoading = isJobLoading || isRowsLoading;
  const error = jobError || rowsError;

  if (isLoading && !jobStatus) return <LoadingSpinner label="Loading import details..." />;
  if (error) return <ErrorAlert error={error} onRetry={() => refetchRows()} />;

  const job = jobStatus?.data;
  const items = rowsData?.data.items || [];
  const total = rowsData?.data.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALID': return <Badge variant="success">Valid</Badge>;
      case 'INVALID': return <Badge variant="danger">Invalid</Badge>;
      case 'IMPORTED': return <Badge variant="primary">Imported</Badge>;
      case 'SKIPPED': return <Badge variant="warning">Skipped</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge variant="success">Completed</Badge>;
      case 'PARTIALLY_COMPLETED': return <Badge variant="warning">Partial</Badge>;
      case 'FAILED': return <Badge variant="danger">Failed</Badge>;
      case 'IMPORTING': return <Badge variant="primary">Importing...</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (!job) return <EmptyState message="Import job not found" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <Button variant="ghost" onClick={() => navigate('/admin/imports')} style={{ padding: '0 0 16px 0', color: COLORS.neutral.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} /> Back to History
        </Button>
        <h1 style={{ margin: '0 0 8px 0', fontFamily: TYPOGRAPHY.fontFamily.headline, fontSize: TYPOGRAPHY.fontSize['2xl'] }}>
          Import Details
        </h1>
        <p style={{ margin: 0, color: COLORS.neutral.textSecondary }}>
          View processing results and error details for this import file.
        </p>
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
        <div>
          <h2 style={{ margin: '0 0 16px 0', fontSize: TYPOGRAPHY.fontSize.lg }}>Summary</h2>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, marginBottom: '4px' }}>Status</div>
              <div>{getJobStatusBadge(job.status)}</div>
            </div>
            <div>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, marginBottom: '4px' }}>File</div>
              <div style={{ fontWeight: 500 }}>{job.file_name}</div>
            </div>
            <div>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, marginBottom: '4px' }}>Total Rows</div>
              <div style={{ fontWeight: 500 }}>{job.total_rows}</div>
            </div>
            <div>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, marginBottom: '4px' }}>Successfully Imported</div>
              <div style={{ fontWeight: 500, color: COLORS.semantic.success[700] }}>{job.success_rows}</div>
            </div>
            <div>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, marginBottom: '4px' }}>Errors / Skipped</div>
              <div style={{ fontWeight: 500, color: job.error_rows > 0 ? COLORS.semantic.danger[700] : 'inherit' }}>{job.error_rows}</div>
            </div>
          </div>
        </div>
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
        <h2 style={{ margin: '0', fontSize: TYPOGRAPHY.fontSize.lg }}>Row History</h2>
        
        {items.length === 0 ? (
          <EmptyState message="No rows found for this import job." />
        ) : (
          <>
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.md }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
                <thead style={{ background: COLORS.neutral[50] }}>
                  <tr style={{ borderBottom: `1px solid ${COLORS.neutral[200]}` }}>
                    <th style={{ padding: '12px 16px', width: '60px' }}>Row</th>
                    <th style={{ padding: '12px 16px', width: '100px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Employee</th>
                    <th style={{ padding: '12px 16px' }}>Criterion / KPI</th>
                    <th style={{ padding: '12px 16px' }}>Value</th>
                    <th style={{ padding: '12px 16px' }}>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.import_row_id} style={{ borderBottom: `1px solid ${COLORS.neutral[100]}`, verticalAlign: 'top' }}>
                      <td style={{ padding: '12px 16px', color: COLORS.neutral.textSecondary }}>{row.row_no}</td>
                      <td style={{ padding: '12px 16px' }}>{getStatusBadge(row.status)}</td>
                      <td style={{ padding: '12px 16px' }}>{String(row.raw_data.employee_id || '-')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div>{String(row.raw_data.criterion_code || '-')}</div>
                        <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>{row.raw_data.kpi_code ? String(row.raw_data.kpi_code) : ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{String(row.raw_data.measurement_value || '-')}</td>
                      <td style={{ padding: '12px 16px', color: COLORS.semantic.danger[700] }}>
                        {row.error_messages && row.error_messages.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {row.error_messages.map((err, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                <AlertCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <span><strong>{err.field}:</strong> {err.message} <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, opacity: 0.8 }}>({err.code})</span></span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: COLORS.neutral.textSecondary }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
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
