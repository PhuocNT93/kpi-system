import React from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS } from '@/shared/theme';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, style, ...props }) => {
  return (
    <div
      style={{
        backgroundColor: COLORS.neutral.white,
        borderRadius: RADII.xl,
        boxShadow: SHADOWS.sm,
        border: `1px solid ${COLORS.neutral[200]}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
