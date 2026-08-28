import React from 'react';
import type { ScopePreviewDTO } from '../types/cycle-types';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Users, Briefcase, UserCheck } from 'lucide-react';
import { LoadingSpinner, ErrorAlert } from '@/shared/components/ui';

interface ScopePreviewCardProps {
  data?: ScopePreviewDTO;
  isLoading?: boolean;
  error?: unknown;
}

export const ScopePreviewCard: React.FC<ScopePreviewCardProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: COLORS.neutral.white,
          border: `1px solid ${COLORS.neutral[200]}`,
          borderRadius: RADII.xl,
        }}
      >
        <LoadingSpinner label="Calculating scope preview..." />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert error={error} />;
  }

  if (!data) return null;

  return (
    <div
      style={{
        backgroundColor: COLORS.neutral.white,
        border: `1px solid ${COLORS.neutral[200]}`,
        borderRadius: RADII.xl,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={18} color={COLORS.primary.DEFAULT} />
          <h3
            style={{
              margin: 0,
              fontSize: TYPOGRAPHY.fontSize.base,
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: COLORS.neutral.textPrimary,
            }}
          >
            Employee Scope Preview
          </h3>
        </div>
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: COLORS.primary.DEFAULT,
            backgroundColor: COLORS.primary[50],
            padding: '4px 12px',
            borderRadius: RADII.full,
          }}
        >
          {data.employeeCount} Applicable Employees
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* By Team */}
        <div
          style={{
            backgroundColor: COLORS.neutral[50],
            borderRadius: RADII.lg,
            padding: '14px',
            border: `1px solid ${COLORS.neutral[200]}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: COLORS.neutral.textSecondary,
              marginBottom: '10px',
            }}
          >
            <Users size={14} />
            Breakdown by Team
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.byTeam.length === 0 ? (
              <span style={{ fontSize: '0.8125rem', color: COLORS.neutral.textSecondary, fontStyle: 'italic' }}>
                All organization teams included
              </span>
            ) : (
              data.byTeam.map((item) => (
                <div
                  key={item.teamId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                  }}
                >
                  <span style={{ color: COLORS.neutral.textPrimary, fontWeight: 500 }}>{item.name}</span>
                  <span style={{ color: COLORS.neutral.textSecondary, fontWeight: 600 }}>{item.count} employees</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Role */}
        <div
          style={{
            backgroundColor: COLORS.neutral[50],
            borderRadius: RADII.lg,
            padding: '14px',
            border: `1px solid ${COLORS.neutral[200]}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: COLORS.neutral.textSecondary,
              marginBottom: '10px',
            }}
          >
            <Briefcase size={14} />
            Breakdown by Job Role
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.byRole.length === 0 ? (
              <span style={{ fontSize: '0.8125rem', color: COLORS.neutral.textSecondary, fontStyle: 'italic' }}>
                All job roles included
              </span>
            ) : (
              data.byRole.map((item) => (
                <div
                  key={item.roleId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                  }}
                >
                  <span style={{ color: COLORS.neutral.textPrimary, fontWeight: 500 }}>{item.name}</span>
                  <span style={{ color: COLORS.neutral.textSecondary, fontWeight: 600 }}>{item.count} employees</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
