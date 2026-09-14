import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCurrentCsvTemplate, downloadCurrentCsvTemplate } from '../api/csv-template-api';
import { uploadCsvFile, confirmImport, getImportStatus, type ImportPreviewResponse } from '../api/import-api';
import { csvTemplateKeys } from '../api/csv-template-keys';
import { evaluationCycleApi } from '@/features/evaluation-cycles/api/cycle-api';
import { LoadingSpinner, ErrorAlert, EmptyState } from '@/shared/components/ui';
import { Button } from '@/shared/ui/Button/Button';
import { Badge } from '@/shared/ui/Badge/Badge';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Download, UploadCloud, AlertCircle, FileText, CheckCircle } from 'lucide-react';
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

export function ImportUploadPage() {
  const navigate = useNavigate();
  const [downloadError, setDownloadError] = useState<unknown | null>(null);
  
  // Upload State
  const [cycleId, setCycleId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(randomUUID());
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [uploadError, setUploadError] = useState<unknown | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirm State
  const [importMode, setImportMode] = useState<'PARTIAL' | 'STRICT'>('PARTIAL');
  const [confirmError, setConfirmError] = useState<unknown | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: template, isLoading, error, refetch } = useQuery({
    queryKey: csvTemplateKeys.current(),
    queryFn: getCurrentCsvTemplate,
  });

  const { data: cycles = [], isLoading: isLoadingCycles } = useQuery({
    queryKey: ['evaluation-cycles'],
    queryFn: () => evaluationCycleApi.getCycles(),
  });

  const selectableCycles = cycles.filter(c => c.status !== 'LOCKED');

  const { data: jobStatus } = useQuery({
    queryKey: ['importJob', activeJobId],
    queryFn: () => getImportStatus(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return (status === 'IMPORTING' || status === 'UPLOADED' || status === 'VALIDATING') ? 2000 : false;
    }
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
      setConfirmError(null);
      setActiveJobId(null);
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

  const confirmMutation = useMutation({
    mutationFn: (variables: { jobId: string, strict: boolean }) =>
      confirmImport(variables.jobId, variables.strict),
    onSuccess: (response) => {
      setConfirmError(null);
      setActiveJobId(response.import_job_id);
    },
    onError: (err: unknown) => {
      setConfirmError(err);
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
      setConfirmError(null);
      setActiveJobId(null);
    }
  };

  const handleUploadClick = () => {
    if (!selectedFile || !cycleId) return;
    uploadMutation.mutate({ cycleId, file: selectedFile, key: idempotencyKey });
  };

  const handleConfirmClick = () => {
    if (!previewData) return;
    
    if (importMode === 'STRICT' && previewData.error_rows > 0) {
      if (!window.confirm(`You selected Strict Mode but there are ${previewData.error_rows} errors. This will fail the import. Proceed?`)) {
        return;
      }
    }

    confirmMutation.mutate({ 
      jobId: previewData.import_job_id, 
      strict: importMode === 'STRICT' 
    });
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
          Upload CSV
        </h1>
        <p style={{ margin: 0, color: COLORS.neutral.textSecondary }}>
          Upload a new evaluation score CSV and review validation errors before confirming.
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
            <select
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
              disabled={isLoadingCycles}
              style={{
                padding: '8px 12px',
                border: `1px solid ${COLORS.neutral[300]}`,
                borderRadius: RADII.md,
                fontSize: TYPOGRAPHY.fontSize.sm,
                backgroundColor: COLORS.neutral.white,
              }}
            >
              <option value="" disabled>-- Select Evaluation Cycle --</option>
              {selectableCycles.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code}) - {c.status}
                </option>
              ))}
            </select>
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
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: 600 }}>{previewData.total_rows}</div>
              </div>
              <div style={{ padding: '16px', background: COLORS.semantic.success[50], borderRadius: RADII.md, flex: 1, border: `1px solid ${COLORS.semantic.success[100]}` }}>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.semantic.success[700] }}>Valid Rows</div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: 600, color: COLORS.semantic.success[700] }}>{previewData.success_rows}</div>
              </div>
              <div style={{ padding: '16px', background: COLORS.semantic.danger[50], borderRadius: RADII.md, flex: 1, border: `1px solid ${COLORS.semantic.danger[100]}` }}>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.semantic.danger[700] }}>Errors</div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: 600, color: COLORS.semantic.danger[700] }}>{previewData.error_rows}</div>
              </div>
            </div>

            {previewData.row_errors && previewData.row_errors.length > 0 && (
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
                      {previewData.row_errors.slice(0, 100).map((err, i) => (
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
                {previewData.row_errors.length > 100 && (
                  <div style={{ marginTop: '8px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    Showing first 100 errors.
                  </div>
                )}
              </div>
            )}
            
            {previewData.error_rows === 0 && previewData.total_rows > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: COLORS.semantic.success[50], color: COLORS.semantic.success[700], borderRadius: RADII.md, fontSize: TYPOGRAPHY.fontSize.sm }}>
                All rows passed validation successfully! You may proceed with the import.
              </div>
            )}

            {!activeJobId && previewData.total_rows > 0 && (
              <div style={{ marginTop: '24px', padding: '16px', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.md }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: TYPOGRAPHY.fontSize.base }}>Import Settings</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="PARTIAL" 
                      checked={importMode === 'PARTIAL'} 
                      onChange={() => setImportMode('PARTIAL')} 
                      style={{ marginTop: '4px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: TYPOGRAPHY.fontSize.sm }}>Partial Import (Recommended)</div>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                        Valid rows will be imported. Rows with errors will be skipped.
                      </div>
                    </div>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="STRICT" 
                      checked={importMode === 'STRICT'} 
                      onChange={() => setImportMode('STRICT')} 
                      style={{ marginTop: '4px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: TYPOGRAPHY.fontSize.sm }}>Strict Mode</div>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                        All or nothing. If any row has an error, the entire import will be rejected.
                      </div>
                    </div>
                  </label>
                </div>

                {!!confirmError && (
                  <div style={{ marginBottom: '16px' }}>
                    <ErrorAlert error={confirmError} />
                  </div>
                )}

                <Button 
                  onClick={handleConfirmClick} 
                  disabled={confirmMutation.isPending || (importMode === 'STRICT' && previewData.error_rows > 0)}
                  variant="primary"
                >
                  {confirmMutation.isPending ? 'Starting Import...' : 'Confirm and Import'}
                </Button>
              </div>
            )}

            {activeJobId && jobStatus && (
              <div style={{ marginTop: '24px', padding: '16px', border: `1px solid ${COLORS.primary[200]}`, background: COLORS.primary[50], borderRadius: RADII.md }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: TYPOGRAPHY.fontSize.base, display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.primary[700] }}>
                  {jobStatus.status === 'COMPLETED' ? <CheckCircle size={18} /> : <LoadingSpinner />}
                  Import Status: {jobStatus.status}
                </h4>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
                  {jobStatus.status === 'COMPLETED' && 'Import completed successfully.'}
                  {jobStatus.status === 'PARTIALLY_COMPLETED' && 'Import finished with some skipped rows.'}
                  {jobStatus.status === 'FAILED' && 'Import failed.'}
                  {(jobStatus.status === 'IMPORTING' || jobStatus.status === 'PREVIEW' || jobStatus.status === 'VALIDATING' || jobStatus.status === 'UPLOADED') && 'Processing your import in the background...'}
                </div>
                
                {(jobStatus.status === 'COMPLETED' || jobStatus.status === 'PARTIALLY_COMPLETED' || jobStatus.status === 'FAILED') && (
                  <div style={{ marginTop: '16px' }}>
                    <Button onClick={() => {
                      setPreviewData(null);
                      setActiveJobId(null);
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      navigate('/admin/imports');
                    }} variant="outlined">
                      View Import History
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
