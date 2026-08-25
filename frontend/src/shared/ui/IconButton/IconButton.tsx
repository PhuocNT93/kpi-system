import React, { useState } from 'react';
import { COLORS } from '@/lib/theme';
import { RADII } from '@/shared/theme';

export type IconButtonShape = 'square' | 'circle';
export type IconButtonColor = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'neutral';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shape?: IconButtonShape;
  colorVariant?: IconButtonColor;
  size?: IconButtonSize;
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  shape = 'circle',
  colorVariant = 'primary',
  size = 'md',
  icon,
  'aria-label': ariaLabel,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getColorStyles = (): React.CSSProperties => {
    switch (colorVariant) {
      case 'primary':
        return {
          backgroundColor: isHovered && !disabled ? COLORS.primary[700] : COLORS.primary.DEFAULT,
          color: COLORS.primary.foreground
        };
      case 'secondary':
        return {
          backgroundColor: isHovered && !disabled ? COLORS.secondary[700] : COLORS.secondary.DEFAULT,
          color: COLORS.secondary.foreground
        };
      case 'tertiary':
        return {
          backgroundColor: isHovered && !disabled ? COLORS.tertiary[800] : COLORS.tertiary[700],
          color: COLORS.tertiary.foreground
        };
      case 'danger':
        return {
          backgroundColor: isHovered && !disabled ? COLORS.semantic.danger[700] : COLORS.semantic.danger.DEFAULT,
          color: COLORS.semantic.danger.foreground
        };
      case 'neutral':
        return {
          backgroundColor: isHovered && !disabled ? COLORS.neutral[300] : COLORS.neutral[200],
          color: COLORS.neutral.textPrimary
        };
    }
  };

  const getSizePx = (): number => {
    switch (size) {
      case 'sm':
        return 32;
      case 'lg':
        return 44;
      case 'md':
      default:
        return 38;
    }
  };

  const sizePx = getSizePx();

  return (
    <button
      aria-label={ariaLabel}
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
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        borderRadius: shape === 'circle' ? RADII.full : RADII.md,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'all 0.18s ease-in-out',
        outline: 'none',
        flexShrink: 0,
        ...getColorStyles(),
        ...style
      }}
      {...rest}
    >
      {icon}
    </button>
  );
};
