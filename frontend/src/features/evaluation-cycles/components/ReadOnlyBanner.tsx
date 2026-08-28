import React from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Lock, ShieldAlert } from 'lucide-react';

interface ReadOnlyBannerProps {
  reason?: string;
}

export const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({
  reason = 'This evaluation cycle is LOCKED. All cycle configurations, evaluation instances, criterion scores, and workflow state transitions are permanently read-only.',
}) => {
  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: COLORS.neutral[900],
        color: COLORS.neutral.white,
        borderRadius: RADII.xl,
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
      role="alert"
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: RADII.lg,
          backgroundColor: COLORS.neutral[800],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Lock size={18} color="#f87171" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#f87171' }}>
            Cycle Status: LOCKED
          </span>
          <ShieldAlert size={14} color="#f87171" />
        </div>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: COLORS.neutral[300], lineHeight: 1.4 }}>
          {reason}
        </p>
      </div>
    </div>
  );
};
