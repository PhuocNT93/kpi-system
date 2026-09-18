import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '../../../shared/ui/Button/Button';
import { COLORS } from '../../../lib/theme';
import { RADII, TYPOGRAPHY, useTheme } from '../../../shared/theme';
import { useUiTranslation } from '../../../shared/i18n/ui-i18n';

interface AuditFilterBarProps {
  entityType: string;
  action: string;
  entityId: string;
  isHrAdmin?: boolean;
  onFilterChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void;
  onReset: () => void;
}

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  entityType,
  action,
  entityId,
  isHrAdmin,
  onFilterChange,
  onReset,
}) => {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: RADII.md,
    border: isDark ? '1px solid #334155' : '1px solid #d1d5db',
    fontSize: TYPOGRAPHY.fontSize.sm,
    backgroundColor: isDark ? '#0f172a' : '#fff',
    color: isDark ? '#f8fafc' : '#0f172a',
    outline: 'none',
  };

  return (
    <div
      style={{
        background: isDark ? '#1e293b' : '#ffffff',
        padding: '1.25rem',
        borderRadius: RADII.lg,
        border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
        marginBottom: '1.5rem',
        boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: isDark ? '#f8fafc' : COLORS.neutral[700], fontWeight: 600 }}>
        <Filter size={18} />
        <span>{t('filterTitle')}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
        {/* Entity Type Filter */}
        <div>
          <label htmlFor="filter-entity-type" style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: isDark ? '#cbd5e1' : COLORS.neutral[600], marginBottom: '0.35rem' }}>
            {t('entityTypeLabel')}
          </label>
          <select
            id="filter-entity-type"
            name="entityType"
            value={entityType}
            onChange={onFilterChange}
            style={inputStyle}
          >
            <option value="">{t('allEntityTypes')}</option>
            <option value="EVALUATION">EVALUATION</option>
            <option value="EVALUATION_ITEM">EVALUATION_ITEM</option>
            <option value="EVALUATION_CYCLE">EVALUATION_CYCLE</option>
            <option value="EVALUATION_TEMPLATE">EVALUATION_TEMPLATE</option>
            <option value="CRITERION">CRITERION</option>
            <option value="CRITERION_VERSION">CRITERION_VERSION</option>
            <option value="KPI">KPI</option>
            <option value="KPI_VERSION">KPI_VERSION</option>
            <option value="KPI_RELATIONSHIP">KPI_RELATIONSHIP</option>
            <option value="CALIBRATION_SESSION">CALIBRATION_SESSION</option>
            <option value="CALIBRATION_ADJUSTMENT">CALIBRATION_ADJUSTMENT</option>
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="TEAM">TEAM</option>
            <option value="DEPARTMENT">DEPARTMENT</option>
            <option value="JOB_LEVEL">JOB_LEVEL</option>
            {!isHrAdmin && <option value="ROLE">ROLE</option>}
          </select>
        </div>

        {/* Action Filter */}
        <div>
          <label htmlFor="filter-action" style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: isDark ? '#cbd5e1' : COLORS.neutral[600], marginBottom: '0.35rem' }}>
            {t('actionLabel')}
          </label>
          <select
            id="filter-action"
            name="action"
            value={action}
            onChange={onFilterChange}
            style={inputStyle}
          >
            <option value="">{t('allActions')}</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="SUBMIT">SUBMIT</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="REQUEST_CORRECTION">REQUEST_CORRECTION</option>
            <option value="PUBLISH">PUBLISH</option>
            <option value="LOCK">LOCK</option>
            <option value="ADJUST">ADJUST</option>
            <option value="CALIBRATION_ADJUST">CALIBRATION_ADJUST</option>
            <option value="CALIBRATION_FINALIZE">CALIBRATION_FINALIZE</option>
          </select>
        </div>

        {/* Entity ID Search */}
        <div>
          <label htmlFor="filter-entity-id" style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: isDark ? '#cbd5e1' : COLORS.neutral[600], marginBottom: '0.35rem' }}>
            {t('entityIdLabel')}
          </label>
          <input
            id="filter-entity-id"
            type="text"
            name="entityId"
            placeholder={t('entityIdPlaceholder')}
            value={entityId}
            onChange={onFilterChange}
            style={inputStyle}
          />
        </div>

        {/* Action Buttons */}
        <div>
          <Button
            type="button"
            variant="outlined"
            onClick={onReset}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '38px',
            }}
          >
            <RotateCcw size={15} />
            {t('resetFilters')}
          </Button>
        </div>
      </div>
    </div>
  );
};
