import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/shared/auth/auth-context';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/ui/Button/Button';
import { LoadingSpinner, EmptyState, ErrorAlert, ConfirmDialog } from '@/shared/components/ui';
import { EvidenceViewer } from '../components/EvidenceViewer';
import {
  createEvaluationDataImport,
  listEvaluationDataImports,
  getEvaluationDataImportPreview,
  patchEvaluationDataImportRecord,
  applyEvaluationDataImport,
} from '../api/evaluation-data-import-api';
import type {
  EvaluationDataImport,
  EvaluationDataImportRecord,
  CreateImportPayload,
  PatchResolutionChoice,
  ImportStatus,
  RecordStatus,
} from '../api/evaluation-data-import.types';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS } from '@/shared/theme';
import {
  UploadCloud,
  FileCheck2,
  History,
  CheckCircle2,
  ShieldAlert,
  Info,
  ChevronRight,
  Code2,
  Sparkles,
} from 'lucide-react';

const SAMPLE_PAYLOAD: CreateImportPayload = {
  source_system: 'Jira Software',
  batch_reference: 'SPRINT-42-METRICS',
  records: [
    {
      employee_code: 'EMP_DEV_02',
      evaluation_cycle_code: '2026-Q2',
      kpi_code: 'KPI_SPEED',
      value: 95.5,
      comment: 'Delivered 18 story points ahead of deadline with zero regression defects.',
      rationale: 'Automated extraction from Jira sprint velocity and bug fix metrics.',
      source_snapshot: {
        source_type: 'JIRA',
        source_name: 'Jira Software Cloud',
        source_reference: 'SPRINT-42-EPIC-101',
        collected_at: new Date().toISOString(),
        collector_version: 'v2.4.0',
        metadata: {
          sprint_id: '42',
          board_id: '12',
          velocity_pct: 95.5,
        },
      },
      evidences: [
        {
          evidence_type: 'URL',
          title: 'Sprint 42 Burndown Chart',
          evidence_url: 'https://jira.company.com/secure/RapidBoard.jspa?rapidView=42',
          description: 'Official Jira sprint velocity & burndown snapshot',
        },
      ],
    },
  ],
};

export const EvaluationDataImportPage: React.FC = () => {
  const { user } = useAuth();
  const isHrAdmin = user?.role === 'HR_ADMIN';
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const hasAccess = isHrAdmin || isSystemAdmin;

  const [activeTab, setActiveTab] = useState<'upload' | 'preview' | 'history'>('upload');

  // History state
  const [historyImports, setHistoryImports] = useState<EvaluationDataImport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<unknown>(null);

  // Active / selected import
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [activeImport, setActiveImport] = useState<EvaluationDataImport | null>(null);
  const [previewRecords, setPreviewRecords] = useState<EvaluationDataImportRecord[]>([]);
  const [previewSummary, setPreviewSummary] = useState<{
    total_records: number;
    valid_records: number;
    conflict_records: number;
    invalid_records: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Payload upload form state
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(SAMPLE_PAYLOAD, null, 2));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadingRealPayload, setLoadingRealPayload] = useState(false);

  const handleLoadRealJiraPayload = async () => {
    try {
      setLoadingRealPayload(true);
      const res = await fetch('/api/collector/jira/payload-export');
      if (res.ok) {
        const json = await res.json();
        setJsonInput(JSON.stringify(json, null, 2));
      } else {
        alert('Không tìm thấy file payload dữ liệu thực tế');
      }
    } catch (err) {
      console.error('Failed to load real payload:', err);
    } finally {
      setLoadingRealPayload(false);
    }
  };

  // Conflict / Record Edit Modal
  const [editingRecord, setEditingRecord] = useState<EvaluationDataImportRecord | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>('');
  const [editRationale, setEditRationale] = useState<string>('');
  const [editResolution, setEditResolution] = useState<PatchResolutionChoice>('USE_INCOMING');
  const [savingEdit, setSavingEdit] = useState(false);

  // Apply dialog state
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{
    status: string;
    applied_count: number;
    conflict_count: number;
    error_count: number;
  } | null>(null);

  // Load history
  const loadHistory = useCallback(async () => {
    if (!hasAccess) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await listEvaluationDataImports(1, 50);
      const items = Array.isArray(res) ? res : ((res as { items?: EvaluationDataImport[] })?.items ?? []);
      setHistoryImports(items);
    } catch (err) {
      setHistoryImports([]);
      setHistoryError(err);
    } finally {
      setHistoryLoading(false);
    }
  }, [hasAccess]);

  // Load preview
  const loadPreview = useCallback(
    async (importId: string, filter?: string) => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const res = await getEvaluationDataImportPreview(
          importId,
          1,
          100,
          filter && filter !== 'ALL' ? filter : undefined
        );
        setActiveImport(res?.import ?? null);
        setPreviewRecords(res?.records ?? []);
        setPreviewSummary(res?.summary ?? null);
      } catch (err) {
        setPreviewError(err);
      } finally {
        setPreviewLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (hasAccess) {
      loadHistory();
    }
  }, [hasAccess, loadHistory]);

  useEffect(() => {
    if (activeImportId) {
      loadPreview(activeImportId, statusFilter);
    }
  }, [activeImportId, statusFilter, loadPreview]);

  // Forbidden UI State
  if (!hasAccess) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            padding: '16px',
            backgroundColor: '#fee2e2',
            borderRadius: RADII.full,
            color: '#dc2626',
            marginBottom: '16px',
          }}
        >
          <ShieldAlert size={48} />
        </div>
        <h2 style={{ fontSize: TYPOGRAPHY.fontSize['2xl'], color: COLORS.neutral.textPrimary, margin: '0 0 8px 0' }}>
          Access Restricted
        </h2>
        <p style={{ color: COLORS.neutral.textSecondary, maxWidth: '440px', margin: '0 auto', fontSize: TYPOGRAPHY.fontSize.sm }}>
          You do not have permission to view or manage KPI data imports. Access is restricted to HR and System Administrators.
        </p>
      </div>
    );
  }

  // Handle JSON Submission
  const handleUpload = async () => {
    setUploadError(null);
    let parsed: CreateImportPayload;
    try {
      parsed = JSON.parse(jsonInput);
      if (!parsed.source_system || !parsed.records || !Array.isArray(parsed.records) || parsed.records.length === 0) {
        throw new Error('Payload must contain "source_system" (string) and "records" (non-empty array).');
      }
    } catch (e: unknown) {
      setUploadError((e as Error)?.message || 'Invalid JSON format.');
      return;
    }

    setUploading(true);
    try {
      const created = await createEvaluationDataImport(parsed);
      setActiveImportId(created.import_id);
      setActiveTab('preview');
      loadHistory();
    } catch (err: unknown) {
      setUploadError((err as Error)?.message || 'Failed to submit import batch.');
    } finally {
      setUploading(false);
    }
  };

  // Open Edit Modal for a row
  const openEditModal = (rec: EvaluationDataImportRecord) => {
    setEditingRecord(rec);
    setEditValue(rec.value);
    setEditComment(rec.comment || '');
    setEditRationale(rec.rationale || '');
    setEditResolution(rec.conflicts ? 'MANUAL_OVERRIDE' : 'USE_INCOMING');
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingRecord || !activeImportId) return;
    setSavingEdit(true);
    try {
      await patchEvaluationDataImportRecord(activeImportId, editingRecord.record_id, {
        value: Number(editValue),
        comment: editComment || null,
        rationale: editRationale,
        resolution: editResolution,
      });
      setEditingRecord(null);
      await loadPreview(activeImportId, statusFilter);
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Failed to update record.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Batch Apply
  const handleApply = async () => {
    if (!activeImportId) return;
    setApplying(true);
    try {
      const result = await applyEvaluationDataImport(activeImportId);
      setApplyResult(result);
      setShowApplyDialog(false);
      await loadPreview(activeImportId, statusFilter);
      await loadHistory();
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Failed to apply import.');
    } finally {
      setApplying(false);
    }
  };

  const getStatusBadgeStyle = (status: ImportStatus | RecordStatus) => {
    switch (status) {
      case 'READY':
      case 'VALID':
      case 'APPLIED':
        return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
      case 'CONFLICT':
      case 'PARTIALLY_APPLIED':
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
      case 'INVALID':
      case 'FAILED':
      case 'REJECTED':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
      case 'VALIDATING':
      case 'APPLYING':
        return { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' };
      default:
        return { bg: COLORS.neutral[100], text: COLORS.neutral[700], border: COLORS.neutral[200] };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '12px', paddingTop: '12px' }}>
      {/* System Admin Notice Banner */}
      {isSystemAdmin && !isHrAdmin && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: RADII.lg,
            color: '#1d4ed8',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: TYPOGRAPHY.fontSize.sm,
          }}
        >
          <Info size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>System Admin Notice:</strong> You are in audit/read-only mode. You can view staged records, conflicts, and lineage. Staging mutations and Batch Apply are reserved for HR Admin.
          </span>
        </div>
      )}

      {/* Header & Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${COLORS.neutral[200]}`,
          paddingBottom: '16px',
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 4px 0',
              fontSize: TYPOGRAPHY.fontSize['2xl'],
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: COLORS.neutral.textPrimary,
            }}
          >
            KPI Data Import
          </h1>
          <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
            Staged ingestion with automated lineage, rationale, evaluator comment, and append-only evidence.
          </p>
        </div>

        {/* Tab Controls */}
        <div
          style={{
            display: 'flex',
            backgroundColor: COLORS.neutral[100],
            padding: '4px',
            borderRadius: RADII.lg,
            gap: '4px',
          }}
        >
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: RADII.md,
              border: 'none',
              backgroundColor: activeTab === 'upload' ? COLORS.neutral.white : 'transparent',
              color: activeTab === 'upload' ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary,
              fontWeight: activeTab === 'upload' ? 600 : 500,
              boxShadow: activeTab === 'upload' ? SHADOWS.sm : 'none',
              cursor: 'pointer',
              fontSize: TYPOGRAPHY.fontSize.sm,
            }}
          >
            <UploadCloud size={16} />
            Stage Payload
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            disabled={!activeImportId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: RADII.md,
              border: 'none',
              backgroundColor: activeTab === 'preview' ? COLORS.neutral.white : 'transparent',
              color: activeTab === 'preview' ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary,
              fontWeight: activeTab === 'preview' ? 600 : 500,
              boxShadow: activeTab === 'preview' ? SHADOWS.sm : 'none',
              cursor: activeImportId ? 'pointer' : 'not-allowed',
              opacity: activeImportId ? 1 : 0.5,
              fontSize: TYPOGRAPHY.fontSize.sm,
            }}
          >
            <FileCheck2 size={16} />
            Preview & Resolution
            {previewSummary && (
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: COLORS.primary[100],
                  color: COLORS.primary[700],
                  padding: '1px 6px',
                  borderRadius: RADII.full,
                }}
              >
                {previewSummary.total_records}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              loadHistory();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: RADII.md,
              border: 'none',
              backgroundColor: activeTab === 'history' ? COLORS.neutral.white : 'transparent',
              color: activeTab === 'history' ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary,
              fontWeight: activeTab === 'history' ? 600 : 500,
              boxShadow: activeTab === 'history' ? SHADOWS.sm : 'none',
              cursor: 'pointer',
              fontSize: TYPOGRAPHY.fontSize.sm,
            }}
          >
            <History size={16} />
            Import History
          </button>
        </div>
      </div>

      {/* ── TAB 1: UPLOAD / INGESTION ── */}
      {activeTab === 'upload' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={20} color={COLORS.primary.DEFAULT} />
                <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                  Input Import Payload (JSON)
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleLoadRealJiraPayload}
                  disabled={loadingRealPayload}
                >
                  <Sparkles size={14} style={{ marginRight: '6px' }} />
                  {loadingRealPayload ? 'Đang nạp...' : '⚡ Nạp dữ liệu Jira PIM thực tế (19 nhân sự)'}
                </Button>
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => setJsonInput(JSON.stringify(SAMPLE_PAYLOAD, null, 2))}
                >
                  Load Sample Payload
                </Button>
              </div>
            </div>

            {uploadError && (
              <div style={{ marginBottom: '16px' }}>
                <ErrorAlert error={new Error(uploadError)} />
              </div>
            )}

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={18}
              disabled={!isHrAdmin}
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '13px',
                padding: '12px',
                borderRadius: RADII.md,
                border: `1px solid ${COLORS.neutral[300]}`,
                backgroundColor: isHrAdmin ? COLORS.neutral.white : COLORS.neutral[50],
                color: COLORS.neutral.textPrimary,
                lineHeight: 1.5,
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '12px' }}>
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={uploading || !isHrAdmin}
              >
                {uploading ? 'Validating & Staging...' : 'Stage & Validate Import'}
              </Button>
            </div>
          </Card>

          {/* Guidelines sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card style={{ padding: '20px', backgroundColor: COLORS.neutral[50] }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                Preserved Lineage Guarantees
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, lineHeight: 1.6 }}>
                <li>
                  <strong>3-Tuple Resolution:</strong> Matching resolves against <code>(evaluation_cycle_code / cycle_id, employee_code, kpi_code)</code>.
                </li>
                <li>
                  <strong>Append-Only Evidence:</strong> Staged evidence maps to final evidence items. Existing items are marked <code>SUPERSEDED</code> with audit audit trail.
                </li>
                <li>
                  <strong>Explainability:</strong> Rationale, comment, and source snapshots are immutably tied to the measurement.
                </li>
                <li>
                  <strong>Atomic Idempotency:</strong> Re-applying will not duplicate records or recalculate scores unnecessarily.
                </li>
              </ul>
            </Card>

            <Card style={{ padding: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                Recent Imports
              </h4>
              {(historyImports ?? []).slice(0, 5).map((imp) => (
                <div
                  key={imp.import_id}
                  onClick={() => {
                    setActiveImportId(imp.import_id);
                    setActiveTab('preview');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: RADII.md,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    borderBottom: `1px solid ${COLORS.neutral[100]}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = COLORS.neutral[100])}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div>
                    <strong>{imp.source_system}</strong>
                    <div style={{ color: COLORS.neutral.textSecondary }}>{imp.record_count} records</div>
                  </div>
                  <ChevronRight size={14} color={COLORS.neutral[400]} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 2: PREVIEW & CONFLICT RESOLUTION ── */}
      {activeTab === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {previewLoading && <LoadingSpinner label="Loading preview records and conflict analysis..." />}

          {Boolean(previewError) && <ErrorAlert error={previewError} onRetry={() => activeImportId && loadPreview(activeImportId, statusFilter)} />}

          {/* Apply Result Banner if present */}
          {applyResult && (
            <div
              style={{
                padding: '16px',
                borderRadius: RADII.lg,
                backgroundColor: applyResult.status === 'APPLIED' ? '#dcfce7' : '#fef3c7',
                border: `1px solid ${applyResult.status === 'APPLIED' ? '#bbf7d0' : '#fde68a'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 color={applyResult.status === 'APPLIED' ? '#15803d' : '#b45309'} size={24} />
                <div>
                  <h4 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.bold }}>
                    Batch Apply Completed with status: {applyResult.status}
                  </h4>
                  <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    Applied: {applyResult.applied_count} | Conflicts: {applyResult.conflict_count} | Errors: {applyResult.error_count}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outlined" onClick={() => setApplyResult(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {!previewLoading && activeImport && (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <Card style={{ padding: '16px', borderLeft: `4px solid ${COLORS.primary.DEFAULT}` }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Total Staged</div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold }}>
                    {previewSummary?.total_records ?? activeImport.record_count}
                  </div>
                </Card>
                <Card style={{ padding: '16px', borderLeft: '4px solid #16a34a' }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Valid (Ready)</div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: '#16a34a' }}>
                    {previewSummary?.valid_records ?? activeImport.success_count}
                  </div>
                </Card>
                <Card style={{ padding: '16px', borderLeft: '4px solid #d97706' }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Conflicts Detected</div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: '#d97706' }}>
                    {previewSummary?.conflict_records ?? activeImport.conflict_count}
                  </div>
                </Card>
                <Card style={{ padding: '16px', borderLeft: '4px solid #dc2626' }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Invalid / Rejected</div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: '#dc2626' }}>
                    {previewSummary?.invalid_records ?? activeImport.error_count}
                  </div>
                </Card>
              </div>

              {/* Action & Filter Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Filter pills */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['ALL', 'VALID', 'CONFLICT', 'INVALID'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: RADII.full,
                        border: `1px solid ${statusFilter === filter ? COLORS.primary.DEFAULT : COLORS.neutral[300]}`,
                        backgroundColor: statusFilter === filter ? COLORS.primary[50] : COLORS.neutral.white,
                        color: statusFilter === filter ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary,
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        fontWeight: statusFilter === filter ? 600 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* Apply Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Button
                    variant="primary"
                    disabled={!isHrAdmin || applying || activeImport.status === 'APPLYING' || Boolean(previewSummary && previewSummary.valid_records === 0)}
                    onClick={() => setShowApplyDialog(true)}
                  >
                    {activeImport.status === 'APPLIED' ? 'Re-Apply Batch' : 'Apply to KPI Evaluations'}
                  </Button>
                </div>
              </div>

              {/* Staged Records Table */}
              <Card style={{ overflow: 'hidden', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
                  <thead>
                    <tr style={{ backgroundColor: COLORS.neutral[50], borderBottom: `1px solid ${COLORS.neutral[200]}` }}>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Cycle</th>
                      <th style={{ padding: '12px 16px' }}>Employee</th>
                      <th style={{ padding: '12px 16px' }}>KPI Code</th>
                      <th style={{ padding: '12px 16px' }}>Value</th>
                      <th style={{ padding: '12px 16px' }}>Rationale / Comment</th>
                      <th style={{ padding: '12px 16px' }}>Evidence</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: COLORS.neutral.textSecondary }}>
                          No records match this filter.
                        </td>
                      </tr>
                    ) : (
                      previewRecords.map((rec) => {
                        const badge = getStatusBadgeStyle(rec.status);
                        return (
                          <tr
                            key={rec.record_id}
                            style={{
                              borderBottom: `1px solid ${COLORS.neutral[200]}`,
                              backgroundColor: rec.status === 'CONFLICT' ? '#fffbeb' : COLORS.neutral.white,
                            }}
                          >
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: RADII.full,
                                  backgroundColor: badge.bg,
                                  color: badge.text,
                                  border: `1px solid ${badge.border}`,
                                }}
                              >
                                {rec.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 500, fontFamily: 'monospace', fontSize: TYPOGRAPHY.fontSize.xs }}>
                              {rec.cycle_code || rec.evaluation_cycle_code || (rec.cycle_id ? `${rec.cycle_id.slice(0, 8)}...` : '—')}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{rec.employee_code}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <code>{rec.kpi_code}</code>
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{rec.value}</td>
                            <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                              <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textPrimary, marginBottom: '2px' }}>
                                {rec.rationale}
                              </div>
                              {rec.comment && (
                                <div style={{ fontSize: '11px', color: COLORS.neutral.textSecondary, fontStyle: 'italic' }}>
                                  "{rec.comment}"
                                </div>
                              )}
                              {rec.error_message && (
                                <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                                  ⚠️ {rec.error_message}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: RADII.md,
                                  backgroundColor: COLORS.neutral[100],
                                  color: COLORS.neutral[700],
                                }}
                              >
                                <FileCheck2 size={12} />
                                {rec.evidences?.length ?? 0} item(s)
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              {isHrAdmin && (
                                <Button
                                  variant="outlined"
                                  size="sm"
                                  onClick={() => openEditModal(rec)}
                                >
                                  {rec.status === 'CONFLICT' ? 'Resolve Conflict' : 'Edit'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── TAB 3: IMPORT HISTORY ── */}
      {activeTab === 'history' && (
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          {historyLoading && <LoadingSpinner label="Loading historical imports..." />}
          {Boolean(historyError) && <ErrorAlert error={historyError} onRetry={loadHistory} />}
          {!historyLoading && (historyImports ?? []).length === 0 && (
            <EmptyState message="No previous KPI imports found. Stage your first payload above." />
          )}

          {!historyLoading && (historyImports ?? []).length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
              <thead>
                <tr style={{ backgroundColor: COLORS.neutral[50], borderBottom: `1px solid ${COLORS.neutral[200]}` }}>
                  <th style={{ padding: '12px 16px' }}>Import ID</th>
                  <th style={{ padding: '12px 16px' }}>Source System</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Records</th>
                  <th style={{ padding: '12px 16px' }}>Created By</th>
                  <th style={{ padding: '12px 16px' }}>Created At</th>
                  <th style={{ padding: '12px 16px' }}>Applied At</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(historyImports ?? []).map((imp) => {
                  const badge = getStatusBadgeStyle(imp.status);
                  return (
                    <tr key={imp.import_id} style={{ borderBottom: `1px solid ${COLORS.neutral[200]}` }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: TYPOGRAPHY.fontSize.xs }}>
                        {(imp.import_id || '').slice(0, 8)}...
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{imp.source_system}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: RADII.full,
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {imp.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {imp.record_count} (✓ {imp.success_count} / ⚠ {imp.conflict_count} / ✗ {imp.error_count})
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: TYPOGRAPHY.fontSize.xs }}>{imp.created_by}</td>
                      <td style={{ padding: '12px 16px', fontSize: TYPOGRAPHY.fontSize.xs }}>
                        {new Date(imp.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: TYPOGRAPHY.fontSize.xs }}>
                        {imp.applied_at ? new Date(imp.applied_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Button
                          variant="outlined"
                          size="sm"
                          onClick={() => {
                            setActiveImportId(imp.import_id);
                            setActiveTab('preview');
                          }}
                        >
                          View Preview
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── CONFLICT RESOLUTION / EDIT DRAFT MODAL ── */}
      {editingRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setEditingRecord(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '600px',
              backgroundColor: COLORS.neutral.white,
              borderRadius: RADII.xl,
              boxShadow: SHADOWS.lg,
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold }}>
              {editingRecord.status === 'CONFLICT' ? 'Resolve Value Conflict' : 'Edit Staged Record'}
            </h3>

            {editingRecord.conflicts && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: RADII.lg,
                  marginBottom: '16px',
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  color: '#92400e',
                }}
              >
                <strong>Conflict Details:</strong> An evaluation record already has value{' '}
                <code>{editingRecord.conflicts.existing_value}</code> from source{' '}
                <code>{editingRecord.conflicts.existing_source || 'manual'}</code>.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, marginBottom: '4px' }}>
                  Resolution Choice
                </label>
                <select
                  value={editResolution}
                  onChange={(e) => setEditResolution(e.target.value as PatchResolutionChoice)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral[300]}`,
                  }}
                >
                  <option value="USE_INCOMING">USE_INCOMING (Accept new imported value)</option>
                  <option value="USE_EXISTING">USE_EXISTING (Preserve current value)</option>
                  <option value="MANUAL_OVERRIDE">MANUAL_OVERRIDE (Specify custom value below)</option>
                  <option value="REJECT_BOTH">REJECT_BOTH (Skip applying this record)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, marginBottom: '4px' }}>
                  Measurement Value
                </label>
                <input
                  type="number"
                  step="any"
                  value={editValue}
                  onChange={(e) => setEditValue(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral[300]}`,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, marginBottom: '4px' }}>
                  Rationale (Audit Lineage)
                </label>
                <textarea
                  value={editRationale}
                  onChange={(e) => setEditRationale(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral[300]}`,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, marginBottom: '4px' }}>
                  Evaluator Comment
                </label>
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral[300]}`,
                  }}
                />
              </div>

              {/* Attached Evidence List in Staging */}
              {editingRecord.evidences && editingRecord.evidences.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, marginBottom: '6px' }}>
                    Staged Evidence ({editingRecord.evidences.length})
                  </label>
                  <EvidenceViewer evidences={editingRecord.evidences} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <Button variant="outlined" onClick={() => setEditingRecord(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── APPLY CONFIRM DIALOG ── */}
      <ConfirmDialog
        isOpen={showApplyDialog}
        title="Confirm KPI Data Import Apply"
        description={
          <div>
            <p style={{ margin: '0 0 10px 0' }}>
              This operation will apply all valid records to target evaluations in chunked batches.
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
              <li>Atomic idempotency prevents duplicate records.</li>
              <li>Existing evidence items will be superseded.</li>
              <li>Rule engine and scoring engine recalculations will execute immediately.</li>
              <li>Cycles marked as LOCKED or evaluations that are PUBLISHED will reject modifications.</li>
            </ul>
          </div>
        }
        confirmLabel={applying ? 'Applying Ingestion...' : 'Confirm & Apply Batch'}
        cancelLabel="Cancel"
        onConfirm={handleApply}
        onCancel={() => setShowApplyDialog(false)}
        isPending={applying}
      />
    </div>
  );
};
