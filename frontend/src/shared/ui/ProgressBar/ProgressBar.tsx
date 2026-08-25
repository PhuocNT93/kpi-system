import React from 'react';
import { COLORS } from '@/lib/theme';
import { RADII } from '@/shared/theme';

export type ProgressBarVariant = 'primary' | 'secondary' | 'tertiary';

export interface ProgressBarProps {
  variant?: ProgressBarVariant;
  value?: number; // 0 to 100
  height?: number;
  showTrack?: boolean;
  style?: React.CSSProperties;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  variant = 'primary',
  value = 75,
  height = 5,
  showTrack = true,
  style
}) => {
  const getBarColor = (): string => {
    switch (variant) {
      case 'primary':
        return COLORS.primary.DEFAULT;
      case 'secondary':
        return COLORS.secondary.DEFAULT;
      case 'tertiary':
        return COLORS.tertiary.DEFAULT;
    }
  };

  const getTrackColor = (): string => {
    switch (variant) {
      case 'primary':
        return COLORS.primary[100];
      case 'secondary':
        return COLORS.secondary[100];
      case 'tertiary':
        return COLORS.tertiary[100];
    }
  };

  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor: showTrack ? getTrackColor() : 'transparent',
        borderRadius: RADII.full,
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      <div
        style={{
          width: `${clampedValue}%`,
          height: '100%',
          backgroundColor: getBarColor(),
          borderRadius: RADII.full,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />
    </div>
  );
};
