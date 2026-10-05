import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check, Edit2, ExternalLink, Eye,
  RefreshCw, RotateCcw, Search, Sparkles, UploadCloud, X
} from 'lucide-react';
import { crawlJobApi } from '../api/crawl-job-api';
import type { CrawlScoringExecutionRecord } from '../api/crawl-job.types';

interface CrawlTaskSummary {
  key: string;
  title?: string;
  url?: string;
  status?: string;
  is_on_time?: boolean;
  task_type?: string;
  issue_type?: string;
}

interface CrawlDataScoresTabProps {
  canReview: boolean;
  selectedExecutionId?: string;
  onSelectExecution?: (executionId: string) => void;
}

export function CrawlDataScoresTab({ canReview, selectedExecutionId }: CrawlDataScoresTabProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reviewFilter, setReviewFilter] = useState<string>('ALL');
  const [searchEmployee, setSearchEmployee] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Modal / Drawer States
  const [inspectingRow, setInspectingRow] = useState<CrawlScoringExecutionRecord | null>(null);
  const [adjustDialogRow, setAdjustDialogRow] = useState<CrawlScoringExecutionRecord | null>(null);
  const [adjustScore, setAdjustScore] = useState<string>('');
  const [adjustComment, setAdjustComment] = useState<string>('');
  const [rejectDialogRow, setRejectDialogRow] = useState<CrawlScoringExecutionRecord | null>(null);
  const [rejectComment, setRejectComment] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  const scoringQuery = useQuery({
    queryKey: ['crawlScoringExecutions', selectedExecutionId, statusFilter, reviewFilter, searchEmployee, page],
    queryFn: () => crawlJobApi.listScoringExecutions({
      crawlExecutionId: selectedExecutionId || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      reviewStatus: reviewFilter === 'ALL' ? undefined : reviewFilter,
      employeeCode: searchEmployee.trim() || undefined,
      page,
      limit: 25,
    }),
  });

  const rows = scoringQuery.data ?? [];

  // Mutations
  const reviewMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { action: 'APPROVE' | 'ADJUST' | 'REJECT'; final_score?: number; comment?: string } }) =>
      crawlJobApi.reviewScoringExecution(id, payload),
    onSuccess: () => {
      setActionError('');
      setAdjustDialogRow(null);
      setRejectDialogRow(null);
      void queryClient.invalidateQueries({ queryKey: ['crawlScoringExecutions'] });
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : 'Failed to submit review.');
    },
  });

  const applyMutation = useMutation({
    mutationFn: (id: string) => crawlJobApi.applyScoringExecution(id),
    onSuccess: () => {
      setActionError('');
      void queryClient.invalidateQueries({ queryKey: ['crawlScoringExecutions'] });
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : 'Failed to apply score.');
    },
  });

  const rescoreMutation = useMutation({
    mutationFn: (crawlDataRowId: string) => crawlJobApi.rescoreRow(crawlDataRowId),
    onSuccess: () => {
      setActionError('');
      void queryClient.invalidateQueries({ queryKey: ['crawlScoringExecutions'] });
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : 'Failed to queue rescoring.');
    },
  });

  const handleApprove = (row: CrawlScoringExecutionRecord) => {
    setActionError('');
    reviewMutation.mutate({
      id: row.id,
      payload: { action: 'APPROVE' },
    });
  };

  const handleOpenAdjust = (row: CrawlScoringExecutionRecord) => {
    setActionError('');
    setAdjustDialogRow(row);
    setAdjustScore(row.final_score != null ? String(row.final_score) : row.score != null ? String(row.score) : '3.00');
    setAdjustComment('');
  };

  const handleSubmitAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustDialogRow) return;
    const scoreNum = parseFloat(adjustScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setActionError('Score must be a valid number.');
      return;
    }
    if (adjustComment.trim().length < 20) {
      setActionError('Adjustment requires a rationale justification of at least 20 characters.');
      return;
    }
    reviewMutation.mutate({
      id: adjustDialogRow.id,
      payload: {
        action: 'ADJUST',
        final_score: scoreNum,
        comment: adjustComment.trim(),
      },
    });
  };

  const handleOpenReject = (row: CrawlScoringExecutionRecord) => {
    setActionError('');
    setRejectDialogRow(row);
    setRejectComment('');
  };

  const handleSubmitReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectDialogRow) return;
    if (rejectComment.trim().length < 20) {
      setActionError('Rejection requires an explanation comment of at least 20 characters.');
      return;
    }
    reviewMutation.mutate({
      id: rejectDialogRow.id,
      payload: {
        action: 'REJECT',
        comment: rejectComment.trim(),
      },
    });
  };

  // Metrics calculation
  const totalCount = rows.length;
  const scoredCount = rows.filter((r) => r.status === 'SUCCESS').length;
  const pendingReviewCount = rows.filter((r) => r.status === 'SUCCESS' && r.review_status === 'PENDING').length;
  const approvedCount = rows.filter((r) => r.review_status === 'APPROVED' || r.review_status === 'ADJUSTED' || r.review_status === 'APPLIED').length;

  return (
    <div className="crawl-section">
      <div className="crawl-section__toolbar">
        <div>
          <h2>Crawl Data & Row-Level AI Scores</h2>
          <p>Inspect raw ingested rows, verify row-level Gemini AI scores, and conduct human review.</p>
        </div>
        <div className="crawl-toolbar-actions">
          <div className="crawl-search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search employee code or name..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
            />
          </div>
          <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)}>
            <option value="ALL">All Review Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="ADJUSTED">Adjusted</option>
            <option value="REJECTED">Rejected</option>
            <option value="APPLIED">Applied</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Scoring Statuses</option>
            <option value="SUCCESS">Scored (Success)</option>
            <option value="QUEUED">Queued</option>
            <option value="RUNNING">Scoring...</option>
            <option value="FAILED">Failed</option>
          </select>
          <button
            className="crawl-button crawl-button--secondary"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ['crawlScoringExecutions'] })}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {actionError && (
        <div className="crawl-alert" style={{ marginBottom: 16 }}>
          <span>{actionError}</span>
        </div>
      )}

      {/* Metrics Header */}
      <div className="crawl-metrics-grid">
        <div className="crawl-metric-card">
          <div className="crawl-metric-card__label">Total Rows</div>
          <div className="crawl-metric-card__value">{totalCount}</div>
        </div>
        <div className="crawl-metric-card">
          <div className="crawl-metric-card__label">AI Scored</div>
          <div className="crawl-metric-card__value" style={{ color: 'var(--crawl-blue)' }}>
            {scoredCount}
          </div>
        </div>
        <div className="crawl-metric-card">
          <div className="crawl-metric-card__label">Pending Human Review</div>
          <div className="crawl-metric-card__value" style={{ color: 'var(--crawl-amber)' }}>
            {pendingReviewCount}
          </div>
        </div>
        <div className="crawl-metric-card">
          <div className="crawl-metric-card__label">Approved / Applied</div>
          <div className="crawl-metric-card__value" style={{ color: 'var(--crawl-green)' }}>
            {approvedCount}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="crawl-table-wrap">
        <table className="crawl-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>KPI Criterion</th>
              <th>Raw Measurement</th>
              <th>AI Score</th>
              <th>Confidence</th>
              <th>AI Reasoning</th>
              <th>Review Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {scoringQuery.isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>
                  Loading row-level AI scores...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ color: 'var(--crawl-muted)' }}>No crawl data records found for current filters.</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const confPercent = row.confidence != null ? Math.round(row.confidence * 100) : null;
                const scoreVal = row.final_score != null ? row.final_score : row.score;
                return (
                  <tr key={row.id}>
                    <td>
                      <div>
                        <strong>{row.employee_code}</strong>
                        {row.employee_name && (
                          <div style={{ fontSize: '12px', color: 'var(--crawl-muted)', marginTop: '2px' }}>
                            {row.employee_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="crawl-cell-mono">{row.criterion_code}</span>
                    </td>
                    <td>
                      <div>
                        <strong>{row.raw_measurement_value ?? '—'}</strong>
                        {row.source_snapshot?.measurement_unit ? (
                          <small style={{ color: 'var(--crawl-muted)', marginLeft: 4 }}>
                            {String(row.source_snapshot.measurement_unit)}
                          </small>
                        ) : null}
                      </div>
                      {Array.isArray(row.source_snapshot?.tasks) && (row.source_snapshot.tasks as CrawlTaskSummary[]).length > 0 && (
                        <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '280px' }}>
                          {(row.source_snapshot.tasks as CrawlTaskSummary[])
                            .slice(0, 3)
                            .map((task, idx) => (
                              <a
                                key={task.key || idx}
                                href={task.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`${task.key}: ${task.title || ''} (${task.status || ''})${task.is_on_time !== undefined ? (task.is_on_time ? ' • Đúng hạn' : ' • Trễ hạn') : ''}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '11px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: task.is_on_time === false ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                  color: task.is_on_time === false ? '#b91c1c' : '#1d4ed8',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                  border: `1px solid ${task.is_on_time === false ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>{task.key}</span>
                                <ExternalLink size={10} />
                              </a>
                            ))}
                          {(row.source_snapshot.tasks as CrawlTaskSummary[]).length > 3 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingRow(row);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--crawl-blue)',
                                fontSize: '11px',
                                cursor: 'pointer',
                                padding: '1px 4px',
                                textDecoration: 'underline',
                                fontWeight: 600,
                              }}
                            >
                              +{(row.source_snapshot.tasks as CrawlTaskSummary[]).length - 3} tasks
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {row.status === 'SUCCESS' && scoreVal != null ? (
                        <span
                          className={`crawl-score-badge ${
                            scoreVal >= 4 ? 'crawl-score-badge--high' : scoreVal >= 3 ? 'crawl-score-badge--mid' : 'crawl-score-badge--low'
                          }`}
                        >
                          <Sparkles size={11} /> {Number(scoreVal).toFixed(2)}
                        </span>
                      ) : (
                        <span className="crawl-status crawl-status--queued">{row.status}</span>
                      )}
                    </td>
                    <td>
                      {confPercent != null ? (
                        <div className="crawl-confidence-bar">
                          <div className="crawl-confidence-bar__track">
                            <div className="crawl-confidence-bar__fill" style={{ width: `${confPercent}%` }} />
                          </div>
                          <span>{confPercent}%</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <div
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: 11,
                          color: 'var(--crawl-muted)',
                        }}
                        title={row.reason || row.error_message || ''}
                      >
                        {row.reason || row.error_message || '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`crawl-status crawl-status--${(row.review_status || 'pending').toLowerCase()}`}>
                        {row.review_status || 'PENDING'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="crawl-row-actions" style={{ justifyContent: 'flex-end', gap: 4 }}>
                        <button
                          className="crawl-icon-button"
                          title="Deep Inspection Drawer"
                          onClick={() => setInspectingRow(row)}
                        >
                          <Eye size={13} />
                        </button>

                        {canReview && row.status === 'SUCCESS' && row.review_status === 'PENDING' && (
                          <>
                            <button
                              className="crawl-icon-button"
                              style={{ color: 'var(--crawl-green)', borderColor: 'var(--crawl-green)' }}
                              title="Approve AI Score"
                              onClick={() => handleApprove(row)}
                            >
                              <Check size={13} />
                            </button>
                            <button
                              className="crawl-icon-button"
                              style={{ color: 'var(--crawl-blue)', borderColor: 'var(--crawl-blue)' }}
                              title="Adjust Score with Rationale"
                              onClick={() => handleOpenAdjust(row)}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="crawl-icon-button"
                              style={{ color: 'var(--crawl-red)', borderColor: 'var(--crawl-red)' }}
                              title="Reject Score"
                              onClick={() => handleOpenReject(row)}
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}

                        {canReview && (row.review_status === 'APPROVED' || row.review_status === 'ADJUSTED') && (
                          <button
                            className="crawl-button crawl-button--primary"
                            style={{ height: 28, fontSize: 11, padding: '0 8px' }}
                            title="Apply to Evaluation Cycle"
                            onClick={() => applyMutation.mutate(row.id)}
                            disabled={applyMutation.isPending}
                          >
                            <UploadCloud size={12} /> Apply
                          </button>
                        )}

                        {canReview && (row.status === 'FAILED' || row.status === 'SUCCESS') && (
                          <button
                            className="crawl-icon-button"
                            title="Rescore Row with Gemini"
                            onClick={() => rescoreMutation.mutate(row.crawl_data_row_id)}
                            disabled={rescoreMutation.isPending}
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 12 }}>
        <span style={{ color: 'var(--crawl-muted)' }}>Page {page}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="crawl-button crawl-button--secondary"
            style={{ height: 28, padding: '0 8px', fontSize: 11 }}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="crawl-button crawl-button--secondary"
            style={{ height: 28, padding: '0 8px', fontSize: 11 }}
            disabled={rows.length < 25}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustDialogRow && (
        <div className="crawl-modal-backdrop">
          <div className="crawl-modal" style={{ maxWidth: 680, width: 'min(680px, 94vw)' }}>
            <div className="crawl-modal__header">
              <h3>Adjust AI KPI Score</h3>
              <button className="crawl-icon-button" onClick={() => setAdjustDialogRow(null)}>
                <X size={15} />
              </button>
            </div>
            <form className="crawl-form" onSubmit={handleSubmitAdjust} style={{ padding: '20px 24px' }}>
              <div>
                <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--crawl-muted)' }}>
                  Employee: <strong>{adjustDialogRow.employee_code}</strong>
                  {adjustDialogRow.employee_name && <span> ({adjustDialogRow.employee_name})</span>} | Criterion:{' '}
                  <strong>{adjustDialogRow.criterion_code}</strong>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    AI Recommended Score
                  </label>
                  <input
                    type="text"
                    disabled
                    value={adjustDialogRow.score != null ? Number(adjustDialogRow.score).toFixed(2) : '—'}
                    style={{ background: 'var(--crawl-wash)' }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Your Final Score (0 - 100 or 1.0 - 5.0) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjustScore}
                    onChange={(e) => setAdjustScore(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: 6 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Mandatory Adjustment Justification * (min 20 characters)
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Explain why the AI recommended score was modified (at least 20 characters)..."
                    value={adjustComment}
                    onChange={(e) => setAdjustComment(e.target.value)}
                    style={{ fontFamily: 'inherit' }}
                  />
                  <div
                    className={`crawl-char-counter ${
                      adjustComment.trim().length >= 20 ? 'crawl-char-counter--valid' : 'crawl-char-counter--invalid'
                    }`}
                  >
                    {adjustComment.trim().length} / 20 characters minimum
                  </div>
                </div>
              </div>
              <div className="crawl-modal__footer" style={{ padding: '14px 0 0 0' }}>
                <button
                  type="button"
                  className="crawl-button crawl-button--secondary"
                  onClick={() => setAdjustDialogRow(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="crawl-button crawl-button--primary"
                  disabled={reviewMutation.isPending || adjustComment.trim().length < 20}
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectDialogRow && (
        <div className="crawl-modal-backdrop">
          <div className="crawl-modal" style={{ maxWidth: 680, width: 'min(680px, 94vw)' }}>
            <div className="crawl-modal__header">
              <h3>Reject AI KPI Score</h3>
              <button className="crawl-icon-button" onClick={() => setRejectDialogRow(null)}>
                <X size={15} />
              </button>
            </div>
            <form className="crawl-form" onSubmit={handleSubmitReject} style={{ padding: '20px 24px' }}>
              <div>
                <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--crawl-muted)' }}>
                  Employee: <strong>{rejectDialogRow.employee_code}</strong>
                  {rejectDialogRow.employee_name && <span> ({rejectDialogRow.employee_name})</span>} | Criterion:{' '}
                  <strong>{rejectDialogRow.criterion_code}</strong>
                </div>

                <div style={{ marginBottom: 6 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Mandatory Rejection Explanation * (min 20 characters)
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide specific reason for rejecting this score..."
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    style={{ fontFamily: 'inherit' }}
                  />
                  <div
                    className={`crawl-char-counter ${
                      rejectComment.trim().length >= 20 ? 'crawl-char-counter--valid' : 'crawl-char-counter--invalid'
                    }`}
                  >
                    {rejectComment.trim().length} / 20 characters minimum
                  </div>
                </div>
              </div>
              <div className="crawl-modal__footer" style={{ padding: '14px 0 0 0' }}>
                <button
                  type="button"
                  className="crawl-button crawl-button--secondary"
                  onClick={() => setRejectDialogRow(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="crawl-button crawl-button--danger"
                  disabled={reviewMutation.isPending || rejectComment.trim().length < 20}
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deep Inspection Drawer (Steps 1 to 6) */}
      {inspectingRow && (
        <div className="crawl-modal-backdrop">
          <div
            className="crawl-modal"
            style={{ maxWidth: 960, width: 'min(960px, 94vw)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="crawl-modal__header">
              <div>
                <h3>Row-Level AI Scoring Deep Inspection</h3>
                <small style={{ color: 'var(--crawl-muted)' }}>
                  Row ID: {inspectingRow.crawl_data_row_id} | Employee: {inspectingRow.employee_code}
                  {inspectingRow.employee_name && ` (${inspectingRow.employee_name})`}
                </small>
              </div>
              <button className="crawl-icon-button" onClick={() => setInspectingRow(null)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div className="crawl-drawer-steps">
                {/* Step 1: Raw Ingested Data */}
                <div className="crawl-drawer-step">
                  <div className="crawl-drawer-step__header">
                    <span className="crawl-drawer-step__title">
                      <span className="crawl-drawer-step__num">1</span>
                      Raw Data & Source Snapshot
                    </span>
                    <span className="crawl-status crawl-status--success">Ingested</span>
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 8 }}>
                    Measurement Value: <strong>{inspectingRow.raw_measurement_value ?? '—'}</strong> | Reference:{' '}
                    <code>{String(inspectingRow.source_snapshot?.source_reference || 'N/A')}</code>
                  </div>

                  {/* Dedicated Tasks List with Clickable Direct Links */}
                  {Array.isArray(inspectingRow.source_snapshot?.tasks) && (inspectingRow.source_snapshot.tasks as CrawlTaskSummary[]).length > 0 && (
                    <div style={{ marginBottom: '14px', border: '1px solid var(--crawl-border)', borderRadius: '8px', padding: '12px', backgroundColor: 'var(--crawl-bg-subtle, rgba(248, 250, 252, 0.8))' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📋 Tasks Read from Source</span>
                          <span style={{ fontSize: '11px', backgroundColor: 'var(--crawl-blue)', color: '#fff', padding: '1px 7px', borderRadius: '10px' }}>
                            {(inspectingRow.source_snapshot.tasks as CrawlTaskSummary[]).length}
                          </span>
                        </strong>
                        <small style={{ color: 'var(--crawl-muted)', fontSize: '11px' }}>Click task link to open directly in Jira / Blueprint</small>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                        {(inspectingRow.source_snapshot.tasks as CrawlTaskSummary[]).map((task, idx) => (
                          <div
                            key={task.key || idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#fff',
                              border: '1px solid var(--crawl-border, #e2e8f0)',
                              fontSize: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                              <a
                                href={task.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#2563eb',
                                  fontWeight: 600,
                                  textDecoration: 'underline',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span>{task.key}</span>
                                <ExternalLink size={12} />
                              </a>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--crawl-text)' }} title={task.title || ''}>
                                {task.title || '(No title)'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                              {(task.task_type || task.issue_type) && (
                                <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                                  {task.task_type || task.issue_type}
                                </span>
                              )}
                              {task.status && (
                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                                  {task.status}
                                </span>
                              )}
                              {task.is_on_time !== undefined && (
                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, backgroundColor: task.is_on_time ? '#dcfce7' : '#fee2e2', color: task.is_on_time ? '#15803d' : '#b91c1c' }}>
                                  {task.is_on_time ? 'On-time' : 'Delayed'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <details style={{ fontSize: '11px', marginTop: '6px' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--crawl-muted)', marginBottom: '4px' }}>
                      View Complete Raw Snapshot JSON
                    </summary>
                    <pre className="crawl-drawer-code" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      {JSON.stringify(inspectingRow.source_snapshot || {}, null, 2)}
                    </pre>
                  </details>
                </div>

                {/* Step 2: Evaluation Rule */}
                <div className="crawl-drawer-step">
                  <div className="crawl-drawer-step__header">
                    <span className="crawl-drawer-step__title">
                      <span className="crawl-drawer-step__num">2</span>
                      Evaluation KPI Criterion
                    </span>
                    <span className="crawl-cell-mono">{inspectingRow.criterion_code}</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Cycle ID: <code>{inspectingRow.evaluation_cycle_id}</code>
                  </div>
                </div>

                {/* Step 3: Prompt Version */}
                <div className="crawl-drawer-step">
                  <div className="crawl-drawer-step__header">
                    <span className="crawl-drawer-step__title">
                      <span className="crawl-drawer-step__num">3</span>
                      Prompt Version & Model
                    </span>
                    <span className="crawl-status crawl-status--published">
                      {inspectingRow.model || 'gemini-2.5-flash'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Prompt: <strong>{inspectingRow.prompt_name || 'KPI Evaluation Prompt'}</strong> (v
                    {inspectingRow.prompt_version_no || 1})
                  </div>
                </div>

                {/* Step 4: AI Input Snapshot */}
                <div className="crawl-drawer-step">
                  <div className="crawl-drawer-step__header">
                    <span className="crawl-drawer-step__title">
                      <span className="crawl-drawer-step__num">4</span>
                      Rendered Prompt (AI Input)
                    </span>
                  </div>
                  <pre className="crawl-drawer-code">
                    {String((inspectingRow.input_snapshot as Record<string, unknown>)?.rendered_prompt || JSON.stringify(inspectingRow.input_snapshot, null, 2))}
                  </pre>
                </div>

                {/* Step 5: AI Output */}
                <div className="crawl-drawer-step">
                  <div className="crawl-drawer-step__header">
                    <span className="crawl-drawer-step__title">
                      <span className="crawl-drawer-step__num">5</span>
                      Gemini Evaluation Result
                    </span>
                    <span
                      className={`crawl-score-badge ${
                        (inspectingRow.score ?? 0) >= 4 ? 'crawl-score-badge--high' : 'crawl-score-badge--mid'
                      }`}
                    >
                      Score: {inspectingRow.score != null ? Number(inspectingRow.score).toFixed(2) : '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    <strong>Reasoning:</strong> {inspectingRow.reason || 'None provided'}
                  </div>
                  {inspectingRow.confidence != null && (
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong>Confidence:</strong> {Math.round(inspectingRow.confidence * 100)}%
                    </div>
                  )}
                  {inspectingRow.evidence && inspectingRow.evidence.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong style={{ fontSize: 12 }}>Evidence Citations:</strong>
                      <ul style={{ margin: '4px 0 0 16px', fontSize: 11 }}>
                        {inspectingRow.evidence.map((ev, i) => (
                          <li key={i}>
                            {ev.claim} {ev.source_reference && <code>({ev.source_reference})</code>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Step 6: Human Review Decision */}
                <div className="crawl-drawer-step">
                  <div className="crawl-drawer-step__header">
                    <span className="crawl-drawer-step__title">
                      <span className="crawl-drawer-step__num">6</span>
                      Human Review Decision
                    </span>
                    <span className={`crawl-status crawl-status--${(inspectingRow.review_status || 'pending').toLowerCase()}`}>
                      {inspectingRow.review_status || 'PENDING'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Final Score: <strong>{inspectingRow.final_score != null ? Number(inspectingRow.final_score).toFixed(2) : 'Pending Review'}</strong>
                  </div>
                  {inspectingRow.reviewer_id && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Reviewed By: <code>{inspectingRow.reviewer_id}</code> at {inspectingRow.reviewed_at ? new Date(inspectingRow.reviewed_at).toLocaleString() : ''}
                    </div>
                  )}
                  {inspectingRow.review_comment && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Review Comment: <em>"{inspectingRow.review_comment}"</em>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="crawl-modal__footer" style={{ padding: '12px 20px' }}>
              <button
                type="button"
                className="crawl-button crawl-button--secondary"
                onClick={() => setInspectingRow(null)}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
