import React, { useState } from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';
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
  onSearch: () => void;
}

const ENTITY_TYPES = [
  'EVALUATION',
  'EVALUATION_ITEM',
  'EVALUATION_CYCLE',
  'EVALUATION_TEMPLATE',
  'CRITERION',
  'CRITERION_VERSION',
  'KPI',
  'KPI_VERSION',
  'KPI_RELATIONSHIP',
  'CALIBRATION_SESSION',
  'CALIBRATION_ADJUSTMENT',
  'EMPLOYEE',
  'TEAM',
  'DEPARTMENT',
  'JOB_LEVEL',
];

const ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'SUBMIT',
  'APPROVE',
  'REJECT',
  'REQUEST_CORRECTION',
  'PUBLISH',
  'LOCK',
  'ADJUST',
  'CALIBRATION_ADJUST',
  'CALIBRATION_FINALIZE',
];

const CONTROL_HEIGHT = '38px';

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  entityType,
  action,
  entityId,
  isHrAdmin,
  onFilterChange,
  onReset,
  onSearch,
}) => {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const activeCount = [entityType, action, entityId].filter(Boolean).length;
  const isResetDisabled = activeCount === 0;
  const [isResetHovered, setIsResetHovered] = useState(false);
  const borderColor = isDark ? '#334155' : '#e5e7eb';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: CONTROL_HEIGHT,
    boxSizing: 'border-box',
    padding: '0 0.75rem',
    borderRadius: RADII.md,
    border: isDark ? '1px solid #334155' : '1px solid #d1d5db',
    fontSize: TYPOGRAPHY.fontSize.sm,
    backgroundColor: isDark ? '#0f172a' : '#fff',
    color: isDark ? '#f8fafc' : '#0f172a',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: 600,
    color: isDark ? '#cbd5e1' : COLORS.neutral[600],
    marginBottom: '0.35rem',
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div
      style={{
        background: isDark ? '#1e293b' : '#ffffff',
        borderRadius: RADII.lg,
        border: `1px solid ${borderColor}`,
        marginBottom: '1.5rem',
        boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          borderBottom: `1px solid ${borderColor}`,
          color: isDark ? '#f8fafc' : COLORS.neutral[700],
          fontSize: TYPOGRAPHY.fontSize.sm,
          fontWeight: 600,
        }}
      >
        <Filter size={16} />
        <span>{t('filterTitle')}</span>
        {activeCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '20px',
              height: '20px',
              padding: '0 6px',
              borderRadius: '10px',
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#dbeafe',
              color: isDark ? '#93c5fd' : '#1e40af',
              border: isDark ? '1px solid rgba(59, 130, 246, 0.45)' : '1px solid #bfdbfe',
            }}
          >
            {activeCount}
          </span>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
        }}
      >
        <div style={{ flex: '1 1 180px' }}>
          <label htmlFor="filter-entity-type" style={labelStyle}>
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
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
            {!isHrAdmin && <option value="ROLE">ROLE</option>}
          </select>
        </div>

        <div style={{ flex: '1 1 180px' }}>
          <label htmlFor="filter-action" style={labelStyle}>
            {t('actionLabel')}
          </label>
          <select id="filter-action" name="action" value={action} onChange={onFilterChange} style={inputStyle}>
            <option value="">{t('allActions')}</option>
            {ACTIONS.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '2 1 240px' }}>
          <label htmlFor="filter-entity-id" style={labelStyle}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={onReset}
            disabled={isResetDisabled}
            title={t('resetFilters')}
            aria-label={t('resetFilters')}
            onMouseEnter={() => setIsResetHovered(true)}
            onMouseLeave={() => setIsResetHovered(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: CONTROL_HEIGHT,
              height: CONTROL_HEIGHT,
              padding: 0,
              borderRadius: '50%',
              border: isDark ? '1.5px solid #475569' : `1.5px solid ${COLORS.neutral.border}`,
              backgroundColor:
                isResetHovered && !isResetDisabled
                  ? isDark
                    ? 'rgba(148, 163, 184, 0.16)'
                    : COLORS.neutral[100]
                  : 'transparent',
              color: isDark ? '#cbd5e1' : COLORS.neutral[600],
              cursor: isResetDisabled ? 'not-allowed' : 'pointer',
              opacity: isResetDisabled ? 0.45 : 1,
              transition: 'opacity 150ms ease, background-color 150ms ease',
            }}
          >
            <RotateCcw size={16} />
          </button>

          <Button
            type="submit"
            variant="primary"
            icon={<Search size={16} />}
            style={{ height: CONTROL_HEIGHT }}
          >
            {t('auditSearchBtn', 'Search')}
          </Button>
        </div>
      </form>
    </div>
  );
};
