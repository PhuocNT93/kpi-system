import { OrgRoleTable } from './OrgRoleTable';
import { JobLevelTable } from './JobLevelTable';
import { ReviewCadenceTable } from './ReviewCadenceTable';
import { Briefcase, Layers, Calendar } from 'lucide-react';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

export function JobArchitectureTab() {
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();

  const cardStyle: React.CSSProperties = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    borderRadius: '8px',
    padding: '1.5rem',
    border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
    boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.02)',
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    color: isDark ? '#f8fafc' : '#111827',
  };

  const descStyle: React.CSSProperties = {
    margin: '0.25rem 0 0',
    fontSize: '0.875rem',
    color: isDark ? '#94a3b8' : '#6b7280',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <div className="org-job-grid">
        {/* Job Roles Section */}
        <div className="org-card" style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                padding: '0.5rem',
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
                borderRadius: '8px',
                color: isDark ? '#93c5fd' : '#1d4ed8',
                flexShrink: 0,
              }}
            >
              <Briefcase size={20} />
            </div>
            <div>
              <h2 style={titleStyle}>{t('job_roles', 'Job Roles')}</h2>
              <p style={descStyle}>{t('job_roles_desc', 'Manage roles and functional areas across the organization.')}</p>
            </div>
          </div>
          <OrgRoleTable />
        </div>

        {/* Job Levels Section */}
        <div className="org-card" style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                padding: '0.5rem',
                backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#f5f3ff',
                borderRadius: '8px',
                color: isDark ? '#c4b5fd' : '#6d28d9',
                flexShrink: 0,
              }}
            >
              <Layers size={20} />
            </div>
            <div>
              <h2 style={titleStyle}>{t('job_levels', 'Job Levels')}</h2>
              <p style={descStyle}>{t('job_levels_desc', 'Manage seniority levels and ranking scales.')}</p>
            </div>
          </div>
          <JobLevelTable />
        </div>

        {/* Review Cadences Section */}
        <div className="org-card org-job-full-width" style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                padding: '0.5rem',
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
                borderRadius: '8px',
                color: isDark ? '#6ee7b7' : '#059669',
                flexShrink: 0,
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={titleStyle}>{t('review_cadences', 'Review Cadences')}</h2>
              <p style={descStyle}>
                {t('review_cadences_desc', 'Configure evaluation intervals and cycles for job levels and individual overrides.')}
              </p>
            </div>
          </div>
          <ReviewCadenceTable />
        </div>
      </div>
    </div>
  );
}
