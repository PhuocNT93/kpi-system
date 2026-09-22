import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, ArrowRight } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';
import type { AttentionItem } from '../types/dashboard.types';

export interface AttentionRequiredListProps {
  items: AttentionItem[];
}

export const AttentionRequiredList: React.FC<AttentionRequiredListProps> = ({ items }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  if (items.length === 0) {
    return null;
  }

  const getItemStyle = (type: AttentionItem['type']) => {
    switch (type) {
      case 'DANGER':
        return {
          icon: <AlertCircle size={18} color="#EF4444" />,
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
          border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
          titleColor: '#EF4444',
        };
      case 'WARNING':
        return {
          icon: <AlertTriangle size={18} color="#F59E0B" />,
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
          border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
          titleColor: '#D97706',
        };
      case 'SUCCESS':
        return {
          icon: <CheckCircle2 size={18} color="#10B981" />,
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
          border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
          titleColor: '#059669',
        };
      case 'INFO':
      default:
        return {
          icon: <Info size={18} color="#3B82F6" />,
          bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
          border: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
          titleColor: '#2563EB',
        };
    }
  };

  return (
    <div
      role="region"
      aria-label="Attention Required"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px',
      }}
    >
      <h2
        style={{
          margin: '0 0 4px 0',
          fontSize: '0.875rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
        }}
      >
        {t('action_required', 'Action / Attention Required')}
      </h2>

      {items.map((item) => {
        const style = getItemStyle(item.type);

        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: RADII.xl,
              backgroundColor: style.bg,
              border: `1px solid ${style.border}`,
              boxShadow: SHADOWS.sm,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {style.icon}
              <div>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: style.titleColor }}>
                  {item.title}
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: isDark ? '#D1D5DB' : COLORS.neutral.textPrimary }}>
                  {item.message}
                </p>
              </div>
            </div>

            {item.action_url && (
              <button
                onClick={() => navigate(item.action_url!)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: RADII.md,
                  border: 'none',
                  backgroundColor: COLORS.primary.DEFAULT,
                  color: COLORS.neutral.white,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <span>{t('take_action', 'Take Action')}</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
