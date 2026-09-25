import React, { useState } from 'react';
import { useCreateIndividualCycles } from '../hooks/useReviewDue';
import { useReviewDueTranslation } from '../hooks/useReviewDueTranslation';
import { useTemplatesQuery } from '@/features/templates/api/use-templates';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button/Button';
import { ErrorAlert, LoadingSpinner } from '@/shared/components/ui';
import { AlertTriangle, CheckCircle2, XCircle, Info, Calendar } from 'lucide-react';
import type { CreateIndividualCyclesResultDTO } from '../types/review-due.types';
import type { ReviewDueItem } from '../domain/review-due-models';

interface IndividualEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmployees: Pick<ReviewDueItem, 'employeeId' | 'employeeCode' | 'employeeName'>[];
  onSuccess?: () => void;
}

export function IndividualEvaluationModal({
  isOpen,
  onClose,
  selectedEmployees,
  onSuccess,
}: IndividualEvaluationModalProps) {
  const { isDark } = useTheme();
  const { t } = useReviewDueTranslation();
  const createMutation = useCreateIndividualCycles();
  const templatesQuery = useTemplatesQuery();

  const [templateVersionId, setTemplateVersionId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [result, setResult] = useState<CreateIndividualCyclesResultDTO | null>(null);

  if (!isOpen) return null;

  const publishedTemplates = (templatesQuery.data ?? []).filter(
    (t) => t.status === 'PUBLISHED' && t.currentVersionId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) return;

    try {
      const response = await createMutation.mutateAsync({
        employee_ids: selectedEmployees.map((e) => e.employeeId),
        template_version_id: templateVersionId || undefined,
        start_date: startDate,
        end_date: endDate,
      });
      setResult(response);
      if (response.created.length > 0) {
        onSuccess?.();
      }
    } catch {
      // Handled by createMutation.error
    }
  };

  const handleClose = () => {
    setResult(null);
    createMutation.reset();
    onClose();
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '12px',
    boxRendering: 'optimizeSpeed',
  } as React.CSSProperties;

  const modalCardStyle: React.CSSProperties = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '680px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    borderRadius: '6px',
    border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    fontSize: '0.875rem',
    outline: 'none',
  };

  return (
    <div style={modalOverlayStyle} onClick={handleClose}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
              {t('modal_title', 'Initiate Individual Review Cycle')}
            </h2>
            <p
              style={{
                margin: '0.25rem 0 0',
                fontSize: '0.8125rem',
                color: isDark ? '#94a3b8' : '#64748b',
              }}
            >
              {t('modal_subtitle', 'Create an individual evaluation cycle and open review for due employees.')}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isDark ? '#94a3b8' : '#64748b',
              fontSize: '1.25rem',
              padding: '0.25rem',
            }}
            aria-label={t('modal_btn_close', 'Close')}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {createMutation.isError && (
            <ErrorAlert error={createMutation.error} />
          )}

          {/* Result view if submitted */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {result.created.length > 0 && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                    border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.4)' : '#a7f3d0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isDark ? '#34d399' : '#059669', fontWeight: 600 }}>
                    <CheckCircle2 size={18} />
                    <span>{t('modal_created_count', 'Successfully created: {count} employee cycle(s)', { count: result.created.length })}</span>
                  </div>
                  <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.5rem', fontSize: '0.8125rem', color: isDark ? '#cbd5e1' : '#334155' }}>
                    {result.created.map((c) => (
                      <li key={c.cycle_id}>
                        {c.code} (Evaluation ID: {c.evaluation_id.slice(0, 8)}…)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
                    border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isDark ? '#fbbf24' : '#d97706', fontWeight: 600 }}>
                    <AlertTriangle size={18} />
                    <span>{t('modal_skipped_count', 'Warnings: {count} employee(s)', { count: result.warnings.length })}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: isDark ? '#fcd34d' : '#92400e' }}>
                    {t('warning_batch_cycle', 'Warning: An organizational batch cycle is scheduled nearby.')}
                  </p>
                  <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.5rem', fontSize: '0.8125rem', color: isDark ? '#fcd34d' : '#92400e' }}>
                    {result.warnings.map((w, idx) => (
                      <li key={idx}>
                        ID: {w.employee_id.slice(0, 8)}… — <strong>{w.warning.cycle_name}</strong> ({w.warning.cycle_code}) [{w.warning.scheduled_date}]
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.conflicts.length > 0 && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                    border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.4)' : '#fecaca'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isDark ? '#f87171' : '#dc2626', fontWeight: 600 }}>
                    <XCircle size={18} />
                    <span>{t('modal_skipped_count', 'Conflicts: {count} employee(s)', { count: result.conflicts.length })}</span>
                  </div>
                  <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.5rem', fontSize: '0.8125rem', color: isDark ? '#fca5a5' : '#b91c1c' }}>
                    {result.conflicts.map((conf, idx) => (
                      <li key={idx}>
                        [{conf.code}] {conf.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Form when not completed */}
          {!result && (
            <form id="individual-eval-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Selected employees pill tags */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  {t('modal_selected_employees', 'Target Employees ({count})', { count: selectedEmployees.length })}
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  }}
                >
                  {selectedEmployees.map((emp) => (
                    <span
                      key={emp.employeeId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: isDark ? '#334155' : '#e2e8f0',
                        color: isDark ? '#f8fafc' : '#1e293b',
                        fontWeight: 500,
                      }}
                    >
                      <span>{emp.employeeName}</span>
                      <span style={{ opacity: 0.7 }}>({emp.employeeCode})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Template Selection */}
              <div>
                <label htmlFor="eval-template" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                  {t('modal_template_label', 'Evaluation Template')}
                </label>
                <select
                  id="eval-template"
                  value={templateVersionId}
                  onChange={(e) => setTemplateVersionId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">{t('modal_template_default', 'Default (Latest Published Template)')}</option>
                  {publishedTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.currentVersionId}>
                      {tpl.name} ({tpl.code}) — {tpl.criteriaCount ?? 0} criteria
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Info size={13} />
                  {t('modal_template_default', 'Default (Latest Published Template)')}
                </span>
              </div>

              {/* Date Ranges - Responsive Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label htmlFor="eval-start-date" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    {t('modal_start_date', 'Evaluation Start Date')} *
                  </label>
                  <input
                    id="eval-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="eval-end-date" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                    {t('modal_end_date', 'Evaluation Due Date')} *
                  </label>
                  <input
                    id="eval-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                  border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe'}`,
                  fontSize: '0.8125rem',
                  color: isDark ? '#93c5fd' : '#1e40af',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'flex-start',
                }}
              >
                <Calendar size={16} style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                <span>
                  {t('modal_subtitle', 'Create an individual evaluation cycle and open review for due employees.')}
                </span>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {result ? (
            <Button onClick={handleClose}>{t('modal_btn_close', 'Close')}</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleClose} disabled={createMutation.isPending}>
                {t('modal_btn_cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                form="individual-eval-form"
                disabled={createMutation.isPending || selectedEmployees.length === 0}
              >
                {createMutation.isPending ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LoadingSpinner label="" /> {t('modal_creating', 'Creating evaluations...')}
                  </span>
                ) : (
                  t('btn_create_evaluation_count', 'Create Evaluation ({count})', { count: selectedEmployees.length })
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
