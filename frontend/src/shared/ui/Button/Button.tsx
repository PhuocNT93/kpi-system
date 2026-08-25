import React, { useState } from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'inverted' | 'outlined';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: isHovered && !disabled ? COLORS.primary[700] : COLORS.primary.DEFAULT,
          color: COLORS.primary.foreground,
          border: '1px solid transparent',
          boxShadow: isHovered && !disabled ? '0 4px 12px rgba(124, 58, 237, 0.25)' : 'none'
        };
      case 'secondary':
        return {
          backgroundColor: isHovered && !disabled ? COLORS.neutral[200] : COLORS.neutral[100],
          color: COLORS.neutral.textPrimary,
          border: '1px solid transparent'
        };
      case 'inverted':
        return {
          backgroundColor: isHovered && !disabled ? COLORS.tertiary[800] : COLORS.tertiary[900],
          color: COLORS.tertiary.foreground,
          border: '1px solid transparent',
          boxShadow: isHovered && !disabled ? '0 4px 12px rgba(15, 23, 42, 0.25)' : 'none'
        };
      case 'outlined':
        return {
          backgroundColor: isHovered && !disabled ? COLORS.neutral[100] : 'transparent',
          color: COLORS.neutral.textPrimary,
          border: `1.5px solid ${COLORS.neutral.border}`
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '6px 14px',
          fontSize: TYPOGRAPHY.fontSize.xs,
          gap: '6px'
        };
      case 'lg':
        return {
          padding: '12px 24px',
          fontSize: TYPOGRAPHY.fontSize.base,
          gap: '10px'
        };
      case 'md':
      default:
        return {
          padding: '9px 18px',
          fontSize: TYPOGRAPHY.fontSize.sm,
          gap: '8px'
        };
    }
  };

  return (
    <button
      disabled={disabled}
      onMouseEnter={(e) => {
        setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        onMouseLeave?.(e);
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: TYPOGRAPHY.fontFamily.body,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        borderRadius: RADII.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'all 0.18s ease-in-out',
        outline: 'none',
        userSelect: 'none',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style
      }}
      {...rest}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
