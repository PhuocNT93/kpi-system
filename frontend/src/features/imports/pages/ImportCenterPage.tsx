import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCurrentCsvTemplate, downloadCurrentCsvTemplate } from '../api/csv-template-api';
import { csvTemplateKeys } from '../api/csv-template-keys';
import { LoadingSpinner, ErrorAlert, EmptyState } from '@/shared/components/ui';
import { Button } from '@/shared/ui/Button/Button';
import { Badge } from '@/shared/ui/Badge/Badge';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Download } from 'lucide-react';

function renderValidationMetadata(rule: Record<string, unknown> | null): string {
  if (!rule) return 'None';
  
  const rules = [];
  if (rule.type) rules.push(`Type: ${rule.type}`);
  if (rule.min !== undefined && rule.max !== undefined) {
    rules.push(`Range: ${rule.min} – ${rule.max}`);
  } else {
    if (rule.min !== undefined) rules.push(`Min: ${rule.min}`);
    if (rule.max !== undefined) rules.push(`Max: ${rule.max}`);
  }
  if (rule.max_length !== undefined) rules.push(`Maximum length: ${rule.max_length}`);
  
  if (rules.length === 0) {
    return 'Validation rules are defined by the server.';
  }
  return rules.join(', ');
}

export function ImportCenterPage() {
  const [downloadError, setDownloadError] = useState<unknown | null>(null);

  const { data: template, isLoading, error, refetch } = useQuery({
    queryKey: csvTemplateKeys.current(),
    queryFn: getCurrentCsvTemplate,
  });

  const downloadMutation = useMutation({
    mutationFn: downloadCurrentCsvTemplate,
    onSuccess: (data) => {
      setDownloadError(null);
      // Trigger download in browser
      const url = window.URL.createObjectURL(data.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || 'import_template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (err) => {
      setDownloadError(err);
    }
  });

  const handleDownload = () => {
    downloadMutation.mutate();
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading CSV templates..." />;
  }

  if (error) {
    return <ErrorAlert error={error} onRetry={() => refetch()} />;
  }

  if (!template) {
    return <EmptyState message="No CSV template versions are available." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ margin: '0 0 8px 0', fontFamily: TYPOGRAPHY.fontFamily.headline, fontSize: TYPOGRAPHY.fontSize['2xl'] }}>
          CSV Template Management
        </h1>
        <p style={{ margin: 0, color: COLORS.neutral.textSecondary }}>
          View and download the current evaluation score import template structure.
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 16px 0', fontSize: TYPOGRAPHY.fontSize.lg }}>Template Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: TYPOGRAPHY.fontSize.sm }}>
              <div style={{ color: COLORS.neutral.textSecondary }}>Code:</div>
              <div style={{ fontWeight: 500 }}>{template.code}</div>
              
              <div style={{ color: COLORS.neutral.textSecondary }}>Version:</div>
              <div>{template.versionNo}</div>
              
              <div style={{ color: COLORS.neutral.textSecondary }}>Status:</div>
              <div>
                <Badge
                  variant={template.status === 'ACTIVE' ? 'success' : template.status === 'DRAFT' ? 'secondary' : 'neutral'}
                >
                  {template.status}
                </Badge>
              </div>
              
              <div style={{ color: COLORS.neutral.textSecondary }}>Effective From:</div>
              <div>{template.effectiveFrom ? new Date(template.effectiveFrom).toLocaleDateString() : '-'}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <Button 
              onClick={handleDownload} 
              disabled={downloadMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={16} />
              {downloadMutation.isPending ? 'Downloading...' : 'Download CSV Template'}
            </Button>
            {downloadError != null && (
              <div style={{ maxWidth: '300px' }}>
                <ErrorAlert error={downloadError} />
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: TYPOGRAPHY.fontSize.base }}>Columns</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.neutral[200]}` }}>
                  <th style={{ padding: '12px 8px' }}>Order</th>
                  <th style={{ padding: '12px 8px' }}>Column</th>
                  <th style={{ padding: '12px 8px' }}>Type</th>
                  <th style={{ padding: '12px 8px' }}>Required</th>
                  <th style={{ padding: '12px 8px' }}>Validation</th>
                </tr>
              </thead>
              <tbody>
                {template.columns.map((col) => (
                  <tr key={col.csvTemplateColumnId} style={{ borderBottom: `1px solid ${COLORS.neutral[100]}` }}>
                    <td style={{ padding: '12px 8px', color: COLORS.neutral.textSecondary }}>{col.displayOrder}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>{col.columnName}</td>
                    <td style={{ padding: '12px 8px' }}>{col.dataType}</td>
                    <td style={{ padding: '12px 8px' }}>
                      {col.columnName === 'kpi_code' ? (
                        <span style={{ color: COLORS.neutral.textSecondary }}>Optional</span>
                      ) : col.required ? (
                        'Yes'
                      ) : (
                        'No'
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', color: COLORS.neutral.textSecondary }}>
                      {renderValidationMetadata(col.validationRule)}
                    </td>
                  </tr>
                ))}
                {template.columns.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: COLORS.neutral.textSecondary }}>
                      No columns defined for this template.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
