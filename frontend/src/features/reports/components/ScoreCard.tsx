import React from 'react';
import { Card } from '@/shared/components/Card';
import { SHADOWS, RADII, TYPOGRAPHY } from '@/shared/theme';
import { COLORS } from '@/lib/theme';
import { TrendingUp } from 'lucide-react';

interface ScoreCardProps {
  title: string;
  score: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  theme?: 'primary' | 'success' | 'warning' | 'info';
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ 
  title, 
  score, 
  subtitle, 
  icon = <TrendingUp size={24} />, 
  theme = 'primary' 
}) => {
  const getThemeColor = () => {
    switch (theme) {
      case 'success': return COLORS.semantic.success[500];
      case 'warning': return COLORS.semantic.warning[500];
      case 'info': return COLORS.primary[500];
      default: return COLORS.primary[500];
    }
  };

  const getThemeBg = () => {
    switch (theme) {
      case 'success': return COLORS.semantic.success[100];
      case 'warning': return COLORS.semantic.warning[100];
      case 'info': return COLORS.primary[100];
      default: return COLORS.primary[100];
    }
  };

  return (
    <Card 
      style={{ 
        padding: '24px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px',
        boxShadow: SHADOWS.sm,
        border: `1px solid ${COLORS.neutral[200]}`,
        borderRadius: RADII.xl,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = SHADOWS.md;
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = SHADOWS.sm;
      }}
    >
      <div 
        style={{ 
          backgroundColor: getThemeBg(), 
          color: getThemeColor(),
          padding: '16px', 
          borderRadius: RADII.lg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {icon}
      </div>
      <div>
        <h3 style={{ 
          margin: 0, 
          fontSize: TYPOGRAPHY.fontSize.sm, 
          color: COLORS.neutral.textSecondary,
          fontWeight: TYPOGRAPHY.fontWeight.medium
        }}>
          {title}
        </h3>
        <div style={{ 
          fontSize: TYPOGRAPHY.fontSize['3xl'], 
          fontWeight: TYPOGRAPHY.fontWeight.bold, 
          color: COLORS.neutral.textPrimary,
          marginTop: '4px'
        }}>
          {score}
        </div>
        {subtitle && (
          <div style={{ 
            fontSize: TYPOGRAPHY.fontSize.xs, 
            color: COLORS.neutral.textSecondary,
            marginTop: '4px'
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </Card>
  );
};
