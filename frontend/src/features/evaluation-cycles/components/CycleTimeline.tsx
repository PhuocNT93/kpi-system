import React from 'react';
import type { CycleStatus } from '../types/cycle-types';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

interface CycleTimelineProps {
  currentStatus: CycleStatus;
}

const CYCLE_STEPS: { status: CycleStatus; label: string }[] = [
  { status: 'DRAFT', label: 'Draft' },
  { status: 'OPEN', label: 'Open' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'REVIEWING', label: 'Reviewing' },
  { status: 'APPROVED', label: 'Approved' },
  { status: 'PUBLISHED', label: 'Published' },
  { status: 'LOCKED', label: 'Locked' },
];

export const CycleTimeline: React.FC<CycleTimelineProps> = ({ currentStatus }) => {
  const getStepIndex = (status: CycleStatus): number => {
    if (status === 'SUBMITTED') return 2;
    if (status === 'CALIBRATION') return 3;
    return CYCLE_STEPS.findIndex((step) => step.status === status);
  };

  const activeIndex = getStepIndex(currentStatus);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        backgroundColor: COLORS.neutral.white,
        border: `1px solid ${COLORS.neutral[200]}`,
        borderRadius: RADII.xl,
        overflowX: 'auto',
        gap: '12px',
      }}
    >
      {CYCLE_STEPS.map((step, idx) => {
        const isCurrent = idx === activeIndex;
        const isCompleted = idx < activeIndex;

        let circleBg = COLORS.neutral[100];
        let circleColor = COLORS.neutral[500];
        let circleBorder = `2px solid ${COLORS.neutral[300]}`;
        let labelColor = COLORS.neutral[500];
        let labelWeight: number = TYPOGRAPHY.fontWeight.medium;

        if (isCurrent) {
          circleBg = currentStatus === 'LOCKED' ? COLORS.neutral[900] : COLORS.primary.DEFAULT;
          circleColor = COLORS.neutral.white;
          circleBorder = `2px solid ${currentStatus === 'LOCKED' ? COLORS.neutral[900] : COLORS.primary.DEFAULT}`;
          labelColor = currentStatus === 'LOCKED' ? COLORS.neutral[900] : COLORS.primary.DEFAULT;
          labelWeight = TYPOGRAPHY.fontWeight.bold;
        } else if (isCompleted) {
          circleBg = COLORS.primary[50];
          circleColor = COLORS.primary.DEFAULT;
          circleBorder = `2px solid ${COLORS.primary[300]}`;
          labelColor = COLORS.neutral[800];
        }

        return (
          <React.Fragment key={step.status}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                minWidth: '72px',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: circleBg,
                  color: circleColor,
                  border: circleBorder,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                }}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: labelColor,
                  fontWeight: labelWeight,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>

            {idx < CYCLE_STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: idx < activeIndex ? COLORS.primary[300] : COLORS.neutral[200],
                  minWidth: '24px',
                  transition: 'background-color 0.2s ease',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
