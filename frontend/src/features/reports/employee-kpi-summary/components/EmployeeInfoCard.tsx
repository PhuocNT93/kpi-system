import React from 'react';
import type { EmployeeInfo, EvaluationInfo } from '../types/kpi-summary.types';
import { resolveLocalizedText } from '../api/kpi-summary.api';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { useReportPalette, type ReportTone } from '../../hooks/use-report-palette';
import { User, Mail, Building, Users, Briefcase, Award, Lock, Calendar, CheckCircle, Clock } from 'lucide-react';

interface EmployeeInfoCardProps {
  employee: EmployeeInfo;
  evaluation: EvaluationInfo;
}

const getStatusTone = (status: string): ReportTone => {
  switch (status.toUpperCase()) {
    case 'SELF_ASSESSMENT':
    case 'OPEN':
      return 'info';
    case 'PUBLISHED':
    case 'APPROVED':
      return 'success';
    default:
      return 'warning';
  }
};

export const EmployeeInfoCard: React.FC<EmployeeInfoCardProps> = ({ employee, evaluation }) => {
  const { t } = useUiTranslation();
  const palette = useReportPalette();
  const statusTone = getStatusTone(evaluation.status);
  const statusColors = palette.tones[statusTone];
  const StatusIcon = statusTone === 'success' ? CheckCircle : Clock;

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: palette.textSecondary,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginBottom: '4px',
  };
  const valueStyle: React.CSSProperties = { fontSize: '0.9rem', fontWeight: 500, color: palette.textPrimary };

  return (
    <div
      style={{
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: '10px',
        padding: '20px 24px',
        boxShadow: palette.shadow,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary, #3b82f6)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
            }}
          >
            {employee.fullName.charAt(0) || <User size={24} />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: palette.textPrimary }}>
                {resolveLocalizedText(employee.fullName, t('reports.summary.unnamed_employee', 'Unnamed Employee'))}
              </h2>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: palette.tones.neutral.bg,
                  color: palette.textSecondary,
                }}
              >
                {resolveLocalizedText(employee.employeeCode)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.85rem', color: palette.textSecondary }}>
              <Mail size={14} />
              <span>{employee.email}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
              backgroundColor: statusColors.bg,
              color: statusColors.fg,
            }}
          >
            <StatusIcon size={14} />
            {evaluation.status === 'MANAGER_REVIEW' ? 'REVIEWING' : evaluation.status}
          </div>

          {evaluation.isLocked && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 600,
                backgroundColor: palette.tones.neutral.bg,
                color: palette.textSecondary,
              }}
              title={t('reports.summary.read_only_tooltip', 'This evaluation is finalized and read-only')}
            >
              <Lock size={13} />
              {t('reports.summary.read_only', 'Read-Only')}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: `1px solid ${palette.border}`,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        <div>
          <div style={labelStyle}>
            <Building size={14} /> {t('reports.summary.department', 'Department')}
          </div>
          <div style={valueStyle}>{resolveLocalizedText(employee.department?.name, '—')}</div>
        </div>

        <div>
          <div style={labelStyle}>
            <Users size={14} /> {t('reports.summary.team', 'Team')}
          </div>
          <div style={valueStyle}>{resolveLocalizedText(employee.team?.name, '—')}</div>
        </div>

        <div>
          <div style={labelStyle}>
            <Briefcase size={14} /> {t('reports.summary.role_and_level', 'Role & Level')}
          </div>
          <div style={valueStyle}>
            {resolveLocalizedText(employee.role?.name, '—')}{' '}
            {employee.jobLevel ? `(${resolveLocalizedText(employee.jobLevel.name)})` : ''}
          </div>
        </div>

        <div>
          <div style={labelStyle}>
            <Award size={14} /> {t('reports.summary.manager', 'Manager')}
          </div>
          <div style={valueStyle}>
            {resolveLocalizedText(employee.manager?.fullName, t('reports.summary.no_manager', 'None'))}
          </div>
        </div>

        <div>
          <div style={labelStyle}>
            <Calendar size={14} /> {t('reports.summary.evaluation_cycle', 'Evaluation Cycle')}
          </div>
          <div style={valueStyle}>{resolveLocalizedText(evaluation.cycleName, '—')}</div>
        </div>
      </div>
    </div>
  );
};
