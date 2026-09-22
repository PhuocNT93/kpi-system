import React from 'react';
import { Users, Shield, Building, Layers, FileCheck, Activity, CheckCircle2 } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { AttentionRequiredList } from './AttentionRequiredList';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';
import type { SystemAdminDashboardData } from '../types/dashboard.types';

export interface SystemAdminDashboardViewProps {
  data: SystemAdminDashboardData;
}

export const SystemAdminDashboardView: React.FC<SystemAdminDashboardViewProps> = ({ data }) => {
  const { summary, details, attention } = data;
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Attention / Health Alerts */}
      <AttentionRequiredList items={attention} />

      {/* Operational Summary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '16px',
        }}
      >
        <SummaryCard
          title={t('total_users', 'Total Users')}
          value={summary.total_users}
          subtitle={`${summary.active_users} ${t('active_system_users', 'active accounts')}`}
          icon={<Users size={20} />}
          variant="default"
        />

        <SummaryCard
          title={t('total_roles', 'Configured Roles')}
          value={summary.total_roles}
          subtitle={t('roles_in_system', 'IAM RBAC security roles')}
          icon={<Shield size={20} />}
          variant="info"
        />

        <SummaryCard
          title={`${t('total_departments', 'Departments')} & ${t('total_teams', 'Teams')}`}
          value={`${summary.total_departments} / ${summary.total_teams}`}
          subtitle={t('across_departments', 'Department & team hierarchy')}
          icon={<Building size={20} />}
          variant="default"
        />

        <SummaryCard
          title={t('total_cycles', 'Evaluation Cycles')}
          value={summary.total_cycles}
          subtitle={t('all_recorded_cycles', 'Historical & active cycles')}
          icon={<Layers size={20} />}
          variant="default"
        />

        <SummaryCard
          title={t('published_templates', 'Published Templates')}
          value={summary.published_templates}
          subtitle={t('active_evaluation_templates', 'Active scoring templates')}
          icon={<FileCheck size={20} />}
          variant="success"
        />
      </div>

      {/* Two Column Layout: System Health & Audit Activity Summary */}
      <div className="dashboard-grid-2">
        {/* System Health Widget */}
        <div
          role="region"
          aria-label="System Health Overview"
          style={{
            padding: 'clamp(16px, 2.5vw, 24px)',
            borderRadius: RADII.xl,
            backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
            border: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
            boxShadow: SHADOWS.sm,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Activity size={18} color="#10B981" />
            <h3
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 700,
                color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
                fontFamily: TYPOGRAPHY.fontFamily.headline,
              }}
            >
              {t('operational_health', 'System & Service Status')}
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: RADII.lg,
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                  {t('services_healthy', 'Core Application Services')}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
                {details.system_health.status}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: RADII.lg,
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                  {t('db_connected', 'PostgreSQL Persistence & Projections')}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
                {details.system_health.database}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: RADII.lg,
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                  {t('audit_active', 'Reporting Read Models')}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
                {details.system_health.read_models}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Activity Summary */}
        <div
          role="region"
          aria-label="Audit Activity Summary"
          style={{
            padding: 'clamp(16px, 2.5vw, 24px)',
            borderRadius: RADII.xl,
            backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
            border: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
            boxShadow: SHADOWS.sm,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 700,
                color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
                fontFamily: TYPOGRAPHY.fontFamily.headline,
              }}
            >
              {t('recent_system_activity', 'Recent Audit Activity')}
            </h3>
            <span style={{ fontSize: '0.75rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
              {details.audit_summary.total_recent_events} total events
            </span>
          </div>

          {details.audit_summary.events_by_action.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
              No audit events recorded in recent operational period.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {details.audit_summary.events_by_action.map((act) => (
                <div
                  key={act.action}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    backgroundColor: isDark ? '#111827' : COLORS.neutral[50],
                  }}
                >
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                    {act.action.replace(/_/g, ' ')}
                  </span>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: COLORS.primary.DEFAULT,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {act.count} events
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
