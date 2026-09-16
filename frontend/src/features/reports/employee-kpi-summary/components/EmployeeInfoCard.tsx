import React from 'react';
import type { EmployeeInfo, EvaluationInfo } from '../types/kpi-summary.types';
import { resolveLocalizedText } from '../api/kpi-summary.api';
import { User, Mail, Building, Users, Briefcase, Award, Lock, Calendar, CheckCircle, Clock } from 'lucide-react';

interface EmployeeInfoCardProps {
  employee: EmployeeInfo;
  evaluation: EvaluationInfo;
}

export const EmployeeInfoCard: React.FC<EmployeeInfoCardProps> = ({ employee, evaluation }) => {
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PUBLISHED':
      case 'APPROVED':
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          color: '#059669',
          icon: <CheckCircle size={14} />,
        };
      case 'REVIEWING':
      case 'SUBMITTED':
        return {
          bg: 'rgba(59, 130, 246, 0.12)',
          color: '#2563eb',
          icon: <Clock size={14} />,
        };
      case 'IN_PROGRESS':
      case 'DRAFT':
      default:
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          color: '#d97706',
          icon: <Clock size={14} />,
        };
    }
  };

  const statusStyle = getStatusBadge(evaluation.status);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        {/* Left identity block */}
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
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {resolveLocalizedText(employee.fullName, 'Unnamed Employee')}
              </h2>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-muted, rgba(0,0,0,0.06))',
                  color: 'var(--text-secondary)',
                }}
              >
                {resolveLocalizedText(employee.employeeCode)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <Mail size={14} />
              <span>{employee.email}</span>
            </div>
          </div>
        </div>

        {/* Right status badges */}
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
              backgroundColor: statusStyle.bg,
              color: statusStyle.color,
            }}
          >
            {statusStyle.icon}
            {evaluation.status}
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
                backgroundColor: 'rgba(107, 114, 128, 0.12)',
                color: 'var(--text-secondary)',
              }}
              title="This evaluation is finalized and read-only"
            >
              <Lock size={13} />
              Read-Only
            </div>
          )}
        </div>
      </div>

      {/* Grid of metadata attributes */}
      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
            <Building size={14} /> Department
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {resolveLocalizedText(employee.department?.name, '—')}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
            <Users size={14} /> Team
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {resolveLocalizedText(employee.team?.name, '—')}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
            <Briefcase size={14} /> Role & Level
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {resolveLocalizedText(employee.role?.name, '—')}{' '}
            {employee.jobLevel ? `(${resolveLocalizedText(employee.jobLevel.name)})` : ''}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
            <Award size={14} /> Manager
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {resolveLocalizedText(employee.manager?.fullName, 'None')}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
            <Calendar size={14} /> Evaluation Cycle
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {resolveLocalizedText(evaluation.cycleName, '—')}
          </div>
        </div>
      </div>
    </div>
  );
};
