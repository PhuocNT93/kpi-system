import React from 'react';
import { COLORS } from '@/lib/theme';

export interface FooterActionBarProps {
  children?: React.ReactNode;
  actions?: React.ReactNode;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  style?: React.CSSProperties;
}

export const FooterActionBar: React.FC<FooterActionBarProps> = ({
  children,
  actions,
  leftActions,
  rightActions,
  style
}) => {
  return (
    <footer
      style={{
        padding: '16px 32px',
        backgroundColor: COLORS.neutral.white,
        borderTop: `1px solid ${COLORS.neutral.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '64px',
        boxSizing: 'border-box',
        ...style
      }}
    >
      {/* Left Slot: Custom action buttons / indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {leftActions}
      </div>

      {/* Right Slot: Custom action buttons (e.g. Back, Save, Next Step) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {rightActions || actions || children}
      </div>
    </footer>
  );
};
