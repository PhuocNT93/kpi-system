import React from 'react';
import type { EvaluationCycleDTO, ScopePreviewDTO } from '../types/cycle-types';
import { Button } from '@/shared/ui/Button/Button';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface OpenCycleConfirmationModalProps {
  isOpen: boolean;
  cycle: EvaluationCycleDTO;
  scopePreview?: ScopePreviewDTO;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const OpenCycleConfirmationModal: React.FC<OpenCycleConfirmationModalProps> = ({
  isOpen,
  cycle,
  scopePreview,
  isPending,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-cycle-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII['2xl'],
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: `1px solid ${COLORS.neutral[200]}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: `1px solid ${COLORS.neutral[200]}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: RADII.lg,
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2
              id="open-cycle-modal-title"
              style={{
                margin: 0,
                fontSize: TYPOGRAPHY.fontSize.lg,
                fontWeight: TYPOGRAPHY.fontWeight.bold,
                color: COLORS.neutral.textPrimary,
              }}
            >
              Open Evaluation Cycle?
            </h2>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: TYPOGRAPHY.fontSize.xs,
                color: COLORS.neutral.textSecondary,
              }}
            >
              You are about to initiate evaluations for: <strong>{cycle.name}</strong> ({cycle.code})
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Scope stats */}
          <div
            style={{
              backgroundColor: COLORS.neutral[50],
              border: `1px solid ${COLORS.neutral[200]}`,
              borderRadius: RADII.lg,
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: COLORS.neutral.textSecondary, marginBottom: '8px' }}>
              Target Employee Scope
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: COLORS.primary.DEFAULT }}>
              {scopePreview?.employeeCount ?? cycle.evaluationSummary?.applicableEmployees ?? 0} Applicable Employees
            </div>
          </div>

          {/* Business rules & effects checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: COLORS.neutral.textPrimary }}>
              Opening this cycle will execute the following snapshot operations:
            </div>

            {[
              'Create immutable evaluation instances for all applicable employees',
              'Snapshot employee team, role, and manager assignment at this exact moment',
              'Snapshot template criteria, weights, level definitions, and scoring rules',
              'Trigger workflow start (transitions cycle status from DRAFT to OPEN)',
              'Log an auditable CYCLE_OPENED system event',
            ].map((text, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8125rem', color: COLORS.neutral[700] }}>
                <CheckCircle2 size={16} color={COLORS.status.success} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Immutable notice */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: RADII.lg,
              fontSize: '0.75rem',
              color: '#1e40af',
              lineHeight: 1.5,
            }}
          >
            <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Historical Snapshot Guarantee:</strong> Once opened, any subsequent employee team transfers or role changes will not alter these generated evaluation snapshots.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: COLORS.neutral[50],
            borderTop: `1px solid ${COLORS.neutral[200]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Opening Cycle...' : 'Confirm & Open Cycle'}
          </Button>
        </div>
      </div>
    </div>
  );
};
