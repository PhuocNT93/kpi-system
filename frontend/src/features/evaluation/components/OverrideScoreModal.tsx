import React, { useState, useEffect } from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { X, Save, AlertTriangle } from 'lucide-react';
import type { EvaluationItem } from '../domain/evaluation-models';
import { getLocalizedText } from '../domain/evaluation-models';

interface OverrideScoreModalProps {
  isOpen: boolean;
  kpiList: EvaluationItem[];
  isSubmitting: boolean;
  onSubmit: (kpiId: string, manual_override_score: number, override_reason: string) => void;
  onClose: () => void;
}

export const OverrideScoreModal: React.FC<OverrideScoreModalProps> = ({
  isOpen,
  kpiList,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  const [selectedKpi, setSelectedKpi] = useState<string>('');
  const [overrideScore, setOverrideScore] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedKpi('');
      setOverrideScore('');
      setOverrideReason('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedKpi) {
      setError('Please select a KPI to override.');
      return;
    }

    const scoreNum = Number(overrideScore);
    if (overrideScore === '' || isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setError('Score must be a number between 0 and 100.');
      return;
    }

    if (!overrideReason.trim()) {
      setError('Reason is required.');
      return;
    }

    onSubmit(selectedKpi, scoreNum, overrideReason);
  };

  const selectedItem = kpiList.find(i => i.evaluation_item_id === selectedKpi);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={!isSubmitting ? onClose : undefined}
    >
      <div
        style={{
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII['2xl'],
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: `1px solid ${COLORS.neutral[200]}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: RADII.full,
                backgroundColor: '#eff6ff',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                Override KPI Score
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
                Manually adjust a specific KPI score (HR/Admin only).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: isSubmitting ? 'default' : 'pointer',
              color: COLORS.neutral[400],
              padding: '4px',
              borderRadius: RADII.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto' }}>
          <form id="override-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600 }}>
                Select KPI <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedKpi}
                onChange={(e) => setSelectedKpi(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: RADII.lg,
                  border: `1px solid ${COLORS.neutral[300]}`,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                }}
              >
                <option value="">-- Select a KPI --</option>
                {kpiList.map((kpi) => (
                  <option key={kpi.evaluation_item_id} value={kpi.evaluation_item_id}>
                    {getLocalizedText(kpi.criterion_name_snapshot)} ({kpi.criterion_code_snapshot})
                  </option>
                ))}
              </select>
            </div>

            {selectedItem && (
              <div style={{ padding: '12px', backgroundColor: COLORS.neutral[50], borderRadius: RADII.md, fontSize: TYPOGRAPHY.fontSize.sm }}>
                <p style={{ margin: '0 0 4px 0' }}>Current Original Score: <strong>{selectedItem.raw_score ?? 'N/A'}</strong></p>
                <p style={{ margin: 0 }}>Current Override Score: <strong>{selectedItem.manual_override_score ?? 'None'}</strong></p>
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600 }}>
                New Score (0-100) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={overrideScore}
                onChange={(e) => setOverrideScore(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. 85.5"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: RADII.lg,
                  border: `1px solid ${COLORS.neutral[300]}`,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600 }}>
                Reason for Override <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                disabled={isSubmitting}
                placeholder="Explain why this score is being overridden..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: RADII.lg,
                  border: `1px solid ${COLORS.neutral[300]}`,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  resize: 'vertical',
                }}
              />
            </div>

            {error && (
              <div style={{ color: '#ef4444', fontSize: TYPOGRAPHY.fontSize.sm }}>
                {error}
              </div>
            )}
          </form>
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${COLORS.neutral[200]}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: COLORS.neutral[50],
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 16px',
              borderRadius: RADII.lg,
              backgroundColor: COLORS.neutral.white,
              border: `1px solid ${COLORS.neutral[300]}`,
              color: COLORS.neutral.textPrimary,
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="override-form"
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              borderRadius: RADII.lg,
              backgroundColor: '#3b82f6',
              border: 'none',
              color: COLORS.neutral.white,
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Save size={16} />
            {isSubmitting ? 'Saving...' : 'Apply Override'}
          </button>
        </div>
      </div>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
    </div>
  );
};
