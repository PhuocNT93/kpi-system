import React from 'react';
import { COLORS } from '@/lib/theme';
import { TYPOGRAPHY } from '@/shared/theme';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Configure Evaluation',
  subtitle,
  actions
}) => {
  return (
    <header
      style={{
        padding: '24px 32px 16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: TYPOGRAPHY.fontFamily.headline,
            fontSize: TYPOGRAPHY.fontSize['2xl'],
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: COLORS.neutral.textPrimary,
            letterSpacing: '-0.02em',
            lineHeight: TYPOGRAPHY.lineHeight.tight
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: '4px 0 0 0',
              fontFamily: TYPOGRAPHY.fontFamily.body,
              fontSize: TYPOGRAPHY.fontSize.sm,
              color: COLORS.neutral.textSecondary
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && <div>{actions}</div>}
    </header>
  );
};
