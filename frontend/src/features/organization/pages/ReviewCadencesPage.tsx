import { ReviewCadenceTable } from '../components/ReviewCadenceTable';
import { useTheme } from '@/shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

export function ReviewCadencesPage() {
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();

  return (
    <div className="org-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
          {t('review_cadences', 'Review Cadences')}
        </h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>
          {t('review_cadences_desc', 'Configure evaluation intervals and cycles for job levels and individual overrides.')}
        </p>
      </div>

      <div
        className="org-card"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        }}
      >
        <ReviewCadenceTable />
      </div>
    </div>
  );
}

export default ReviewCadencesPage;
