import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCurrentCsvTemplate, downloadCurrentCsvTemplate } from '../api/csv-template-api';
import { uploadCsvFile, type ImportPreviewResponse } from '../api/import-api';
import { csvTemplateKeys } from '../api/csv-template-keys';
import { LoadingSpinner, ErrorAlert, EmptyState } from '@/shared/components/ui';
import { Button } from '@/shared/ui/Button/Button';
import { Badge } from '@/shared/ui/Badge/Badge';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Download, UploadCloud, AlertCircle, FileText } from 'lucide-react';
import { randomUUID } from '@/shared/utils/uuid';

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
  
  // Upload State
  const [cycleId, setCycleId] = useState('02d1847e-97ec-449e-b762-b94f923c5ed7'); // Pre-fill with a valid seed cycle ID
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(randomUUID());
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [uploadError, setUploadError] = useState<unknown | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: template, isLoading, error, refetch } = useQuery({
    queryKey: csvTemplateKeys.current(),
    queryFn: getCurrentCsvTemplate,
  });

  const downloadMutation = useMutation({
    mutationFn: downloadCurrentCsvTemplate,
    onSuccess: (data) => {
      setDownloadError(null);
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

  const uploadMutation = useMutation({
    mutationFn: (variables: { cycleId: string, file: File, key: string }) => 
      uploadCsvFile(variables.cycleId, variables.file, variables.key),
    onSuccess: (response) => {
      setPreviewData(response);
      setUploadError(null);
      // Reset idempotency key for next upload, but ONLY if we intend to do another action
      setIdempotencyKey(randomUUID());
    },
    onError: (err: unknown) => {
      setUploadError(err);
      const error = err as Error & { code?: string };
      if (error.code !== 'DUPLICATE_IMPORT' && error.code !== 'NETWORK_ERROR') {
        setIdempotencyKey(randomUUID()); // Reset on distinct bad requests
      }
    }
  });

  const handleDownload = () => {
    downloadMutation.mutate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setPreviewData(null);
      setUploadError(null);
    }
  };

  const handleUploadClick = () => {
    if (!selectedFile || !cycleId) return;
    uploadMutation.mutate({ cycleId, file: selectedFile, key: idempotencyKey });
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

      {/* Upload Section */}
      <div style={{
        background: COLORS.neutral.white,
        border: `1px solid ${COLORS.neutral[200]}`,
        borderRadius: RADII.lg,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg }}>Upload CSV Data</h2>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '250px' }}>
            <label style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 500 }}>Evaluation Cycle ID</label>
            <input 
              type="text" 
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
              placeholder="e.g. 02d1847e-97ec-449e-b762-b94f923c5ed7"
              style={{
                padding: '8px 12px',
                border: `1px solid ${COLORS.neutral[300]}`,
                borderRadius: RADII.md,
                fontSize: TYPOGRAPHY.fontSize.sm
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 2, minWidth: '300px' }}>
            <label style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 500 }}>Select CSV File</label>
            <input 
              type="file" 
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{
                padding: '7px 12px',
                border: `1px solid ${COLORS.neutral[300]}`,
                borderRadius: RADII.md,
                fontSize: TYPOGRAPHY.fontSize.sm
              }}
            />
          </div>

          <Button 
            onClick={handleUploadClick} 
            disabled={uploadMutation.isPending || !selectedFile || !cycleId}
            variant="primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px' }}
          >
            <UploadCloud size={16} />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload & Validate'}
          </Button>
        </div>

        {!!uploadError && (
          <ErrorAlert error={uploadError} />
        )}

        {previewData && (
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: TYPOGRAPHY.fontSize.base, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} />
              Validation Preview
            </h3>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: COLORS.neutral[50], borderRadius: RADII.md, flex: 1, border: `1px solid ${COLORS.neutral[200]}` }}>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>Total Rows</div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: 600 }}>{previewData.data.total_rows}</div>
              </div>
              <div style={{ padding: '16px', background: COLORS.semantic.success[50], borderRadius: RADII.md, flex: 1, border: `1px solid ${COLORS.semantic.success[100]}` }}>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.semantic.success[700] }}>Valid Rows</div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: 600, color: COLORS.semantic.success[700] }}>{previewData.data.success_rows}</div>
              </div>
              <div style={{ padding: '16px', background: COLORS.semantic.danger[50], borderRadius: RADII.md, flex: 1, border: `1px solid ${COLORS.semantic.danger[100]}` }}>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.semantic.danger[700] }}>Errors</div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: 600, color: COLORS.semantic.danger[700] }}>{previewData.data.error_rows}</div>
              </div>
            </div>

            {previewData.meta.row_errors && previewData.meta.row_errors.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.semantic.danger[700], display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} />
                  Row Validation Errors
                </h4>
                <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.md }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
                    <thead style={{ background: COLORS.neutral[50] }}>
                      <tr style={{ borderBottom: `1px solid ${COLORS.neutral[200]}` }}>
                        <th style={{ padding: '8px 12px' }}>Row</th>
                        <th style={{ padding: '8px 12px' }}>Field</th>
                        <th style={{ padding: '8px 12px' }}>Error Code</th>
                        <th style={{ padding: '8px 12px' }}>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.meta.row_errors.slice(0, 100).map((err, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${COLORS.neutral[100]}` }}>
                          <td style={{ padding: '8px 12px', color: COLORS.neutral.textSecondary }}>{err.row_no}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{err.field}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <Badge variant={err.code === 'AMBIGUOUS_KPI_FOR_CRITERION' ? 'secondary' : 'danger'}>{err.code}</Badge>
                          </td>
                          <td style={{ padding: '8px 12px', color: COLORS.semantic.danger[700] }}>{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.meta.row_errors.length > 100 && (
                  <div style={{ marginTop: '8px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    Showing first 100 errors.
                  </div>
                )}
              </div>
            )}
            
            {previewData.data.error_rows === 0 && previewData.data.total_rows > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: COLORS.semantic.success[50], color: COLORS.semantic.success[700], borderRadius: RADII.md, fontSize: TYPOGRAPHY.fontSize.sm }}>
                All rows passed validation successfully! You may proceed with the import.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
