import React from 'react';
import type { CycleStatus } from '../types/cycle-types';
import { COLORS } from '@/lib/theme';
import { RADII } from '@/shared/theme';

interface CycleStatusBadgeProps {
  status: CycleStatus;
}

const STATUS_CONFIG: Record<CycleStatus, { bg: string; color: string; label: string; border: string }> = {
  DRAFT: {
    bg: COLORS.neutral[100],
    color: COLORS.neutral[700],
    label: 'DRAFT',
    border: COLORS.neutral[300],
  },
  OPEN: {
    bg: COLORS.primary[50],
    color: COLORS.primary[700],
    label: 'OPEN',
    border: COLORS.primary[200],
  },
  IN_PROGRESS: {
    bg: '#e0f2fe',
    color: '#0369a1',
    label: 'IN PROGRESS',
    border: '#bae6fd',
  },
  SUBMITTED: {
    bg: '#fef3c7',
    color: '#b45309',
    label: 'SUBMITTED',
    border: '#fde68a',
  },
  REVIEWING: {
    bg: '#f3e8ff',
    color: '#7e22ce',
    label: 'REVIEWING',
    border: '#e9d5ff',
  },
  CALIBRATION: {
    bg: '#fae8ff',
    color: '#86198f',
    label: 'CALIBRATION',
    border: '#f5d0fe',
  },
  APPROVED: {
    bg: '#dcfce7',
    color: '#15803d',
    label: 'APPROVED',
    border: '#bbf7d0',
  },
  PUBLISHED: {
    bg: '#d1fae5',
    color: '#047857',
    label: 'PUBLISHED',
    border: '#a7f3d0',
  },
  LOCKED: {
    bg: COLORS.neutral[800],
    color: COLORS.neutral.white,
    label: 'LOCKED',
    border: COLORS.neutral[900],
  },
};

export const CycleStatusBadge: React.FC<CycleStatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] ?? {
    bg: COLORS.neutral[100],
    color: COLORS.neutral[800],
    label: status,
    border: COLORS.neutral[300],
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: RADII.full,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        lineHeight: 1,
      }}
      aria-label={`Cycle status: ${config.label}`}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.color,
        }}
      />
      {config.label}
    </span>
  );
};
