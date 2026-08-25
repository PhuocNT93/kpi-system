import React from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

export type BadgeVariant = 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'danger' | 'success';

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  icon,
  children,
  style
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: COLORS.primary.DEFAULT,
          color: COLORS.primary.foreground
        };
      case 'secondary':
        return {
          backgroundColor: COLORS.secondary.DEFAULT,
          color: COLORS.secondary.foreground
        };
      case 'tertiary':
        return {
          backgroundColor: COLORS.tertiary.DEFAULT,
          color: COLORS.tertiary.foreground
        };
      case 'neutral':
        return {
          backgroundColor: COLORS.neutral[200],
          color: COLORS.neutral.textPrimary
        };
      case 'danger':
        return {
          backgroundColor: COLORS.semantic.danger.DEFAULT,
          color: COLORS.semantic.danger.foreground
        };
      case 'success':
        return {
          backgroundColor: COLORS.semantic.success.DEFAULT,
          color: COLORS.semantic.success.foreground
        };
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5px 12px',
        borderRadius: RADII.md,
        gap: '6px',
        fontFamily: TYPOGRAPHY.fontFamily.label,
        fontSize: TYPOGRAPHY.fontSize.xs,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        letterSpacing: '0.02em',
        userSelect: 'none',
        ...getVariantStyles(),
        ...style
      }}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
