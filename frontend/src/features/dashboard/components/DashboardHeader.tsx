import React from 'react';
import { RefreshCw, Calendar, Clock, Shield } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';
import type { DashboardCycle, DashboardRole } from '../types/dashboard.types';

export interface DashboardHeaderProps {
  role: DashboardRole;
  cycle?: DashboardCycle;
  lastUpdated?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  role,
  cycle,
  lastUpdated,
  isRefreshing,
  onRefresh,
}) => {
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  const getRoleBadge = (r: DashboardRole) => {
    switch (r) {
      case 'EMPLOYEE':
        return { label: t('role_employee', 'Employee Dashboard'), bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
      case 'MANAGER':
        return { label: t('role_manager', 'Manager Dashboard'), bg: '#FDF2F8', color: '#DB2777', border: '#FBCFE8' };
      case 'HR_ADMIN':
        return { label: t('role_hr_admin', 'HR Admin Dashboard'), bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' };
      case 'SYSTEM_ADMIN':
        return { label: t('role_system_admin', 'System Admin Dashboard'), bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' };
    }
  };

  const badge = getRoleBadge(role);
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: RADII.full,
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : badge.bg,
              color: isDark ? '#E5E7EB' : badge.color,
              border: `1px solid ${isDark ? '#4B5563' : badge.border}`,
            }}
          >
            <Shield size={12} />
            {badge.label}
          </span>

          {cycle?.name && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: RADII.full,
                fontSize: '0.75rem',
                fontWeight: 500,
                backgroundColor: isDark ? '#1F2937' : COLORS.neutral[100],
                color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
                border: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
              }}
            >
              <Calendar size={12} />
              {cycle.name}
            </span>
          )}
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)',
            fontWeight: 800,
            color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
            fontFamily: TYPOGRAPHY.fontFamily.headline,
            letterSpacing: '-0.02em',
          }}
        >
          {t('page_title', 'Performance & Statistics Overview')}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {formattedTime && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
            }}
          >
            <Clock size={14} />
            <span>{t('last_updated', 'Updated')}: {formattedTime}</span>
          </div>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={t('refresh', 'Refresh dashboard data')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: RADII.lg,
              border: `1px solid ${isDark ? '#4B5563' : COLORS.neutral[300]}`,
              backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
              color: isDark ? '#E5E7EB' : COLORS.neutral.textPrimary,
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
              opacity: isRefreshing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isRefreshing ? t('refreshing', 'Refreshing...') : t('refresh', 'Refresh')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
