import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, ChevronDown, Check, User } from 'lucide-react';
import { useEmployeeSearch } from '../../../organization/hooks/useEmployeeSearch';
import type { EmployeeSearchItem } from '../../../organization/api/employee-search.api';
import { useEvaluationCyclesQuery } from '../../../evaluation-cycles/hooks/use-evaluation-cycles';
import { resolveLocalizedText } from '../api/kpi-summary.api';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { useReportPalette, type ReportTone } from '../../hooks/use-report-palette';

interface EmployeeSearchBarProps {
  selectedEmployeeId: string | null;
  onSelectEmployee: (emp: EmployeeSearchItem) => void;
  currentUserRole?: string;
  currentUserId?: string;
  selectedCycleId?: string;
  onSelectCycle?: (cycleId: string) => void;
}

const EVALUATION_STATUS_OPTIONS = [
  'DRAFT',
  'IN_PROGRESS',
  'SELF_ASSESSMENT',
  'MANAGER_ASSESSMENT',
  'SUBMITTED',
  'MANAGER_REVIEW',
  'REVIEWING',
  'APPROVED',
  'PUBLISHED',
  'LOCKED',
];

const getStatusTone = (status: string): ReportTone => {
  if (status === 'PUBLISHED' || status === 'APPROVED') return 'success';
  if (status === 'SELF_ASSESSMENT' || status === 'OPEN') return 'info';
  return 'warning';
};

export const EmployeeSearchBar: React.FC<EmployeeSearchBarProps> = ({
  selectedEmployeeId,
  onSelectEmployee,
  currentUserRole,
  selectedCycleId,
  onSelectCycle,
}) => {
  const { t } = useUiTranslation();
  const { isDark } = useTheme();
  const palette = useReportPalette();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filters
  const [department, setDepartment] = useState('');
  const [team, setTeam] = useState('');
  const [role, setRole] = useState('');
  const [jobLevel, setJobLevel] = useState('');
  const [evaluationStatus, setEvaluationStatus] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside to close results dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch cycles
  const { data: cyclesData } = useEvaluationCyclesQuery();
  const cycles = Array.isArray(cyclesData) ? cyclesData : [];

  // Search query
  const isEmployeeRole = currentUserRole === 'EMPLOYEE';
  const { data: searchResponse, isLoading: isSearching } = useEmployeeSearch({
    q: debouncedSearch || undefined,
    department: department || undefined,
    team: team || undefined,
    role: role || undefined,
    jobLevel: jobLevel || undefined,
    evaluationStatus: evaluationStatus || undefined,
    evaluationCycle: selectedCycleId || undefined,
    page: 1,
    size: 20,
  });

  const employees = searchResponse?.employees || [];

  const handleSelect = (emp: EmployeeSearchItem) => {
    onSelectEmployee(emp);
    setIsDropdownOpen(false);
  };

  const handleClearFilters = () => {
    setDepartment('');
    setTeam('');
    setRole('');
    setJobLevel('');
    setEvaluationStatus('');
  };

  const hasActiveFilters = Boolean(department || team || role || jobLevel || evaluationStatus);

  const fieldLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: palette.textSecondary,
    marginBottom: '4px',
  };
  const filterFieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '6px',
    border: `1px solid ${palette.inputBorder}`,
    backgroundColor: palette.inputBg,
    color: palette.textPrimary,
    fontSize: '0.85rem',
    boxSizing: 'border-box',
    colorScheme: isDark ? 'dark' : 'light',
  };
  const dropdownMessageStyle: React.CSSProperties = {
    padding: '16px',
    textAlign: 'center',
    color: palette.textSecondary,
    fontSize: '0.875rem',
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: '10px',
        padding: '16px 20px',
        boxShadow: palette.shadow,
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: palette.textMuted,
            }}
          />
          <input
            type="text"
            placeholder={
              isEmployeeRole
                ? t('reports.summary.search_placeholder_self', 'Your profile is selected')
                : t('reports.summary.search_placeholder', 'Search employee by name (supports Vietnamese diacritics), code, email...')
            }
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (!isEmployeeRole) setIsDropdownOpen(true);
            }}
            disabled={isEmployeeRole}
            style={{
              width: '100%',
              padding: '9px 36px 9px 38px',
              borderRadius: '8px',
              border: `1px solid ${palette.inputBorder}`,
              backgroundColor: isEmployeeRole ? palette.surfaceMuted : palette.inputBg,
              color: palette.textPrimary,
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchTerm && !isEmployeeRole && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDebouncedSearch('');
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: palette.textSecondary,
                padding: '4px',
              }}
              aria-label={t('reports.summary.clear_search', 'Clear search')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {cycles.length > 0 && onSelectCycle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: palette.textSecondary, whiteSpace: 'nowrap' }}>
              {t('reports.summary.cycle_label', 'Cycle:')}
            </span>
            <select
              value={selectedCycleId || ''}
              onChange={(e) => onSelectCycle(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${palette.inputBorder}`,
                backgroundColor: palette.inputBg,
                color: palette.textPrimary,
                fontSize: '0.875rem',
                cursor: 'pointer',
                colorScheme: isDark ? 'dark' : 'light',
              }}
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {resolveLocalizedText(c.name) || c.code}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isEmployeeRole && (
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: `1px solid ${hasActiveFilters ? 'var(--primary, #3b82f6)' : palette.inputBorder}`,
              backgroundColor: hasActiveFilters ? palette.tones.info.bg : palette.inputBg,
              color: hasActiveFilters ? palette.tones.info.fg : palette.textPrimary,
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Filter size={16} />
            {t('reports.summary.filters', 'Filters')}
            {hasActiveFilters && (
              <span
                style={{
                  backgroundColor: 'var(--primary, #3b82f6)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '4px',
                }}
              >
                !
              </span>
            )}
            <ChevronDown size={14} style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>

      {isFilterOpen && !isEmployeeRole && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${palette.border}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <label style={fieldLabelStyle}>{t('reports.summary.department', 'Department')}</label>
            <input
              type="text"
              placeholder={t('reports.summary.department_placeholder', 'e.g. Engineering')}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={filterFieldStyle}
            />
          </div>

          <div>
            <label style={fieldLabelStyle}>{t('reports.summary.team', 'Team')}</label>
            <input
              type="text"
              placeholder={t('reports.summary.team_placeholder', 'e.g. Backend')}
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              style={filterFieldStyle}
            />
          </div>

          <div>
            <label style={fieldLabelStyle}>{t('reports.summary.role', 'Role')}</label>
            <input
              type="text"
              placeholder={t('reports.summary.role_placeholder', 'e.g. Engineer')}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={filterFieldStyle}
            />
          </div>

          <div>
            <label style={fieldLabelStyle}>{t('reports.summary.status', 'Status')}</label>
            <select
              value={evaluationStatus}
              onChange={(e) => setEvaluationStatus(e.target.value)}
              style={filterFieldStyle}
            >
              <option value="">{t('reports.summary.all_statuses', 'All Statuses')}</option>
              {EVALUATION_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={handleClearFilters}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${palette.inputBorder}`,
                  backgroundColor: 'transparent',
                  color: palette.textSecondary,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {t('reports.summary.clear_filters', 'Clear Filters')}
              </button>
            </div>
          )}
        </div>
      )}

      {isDropdownOpen && !isEmployeeRole && (
        <div
          style={{
            position: 'absolute',
            zIndex: 50,
            left: '20px',
            right: '20px',
            marginTop: '8px',
            maxHeight: '320px',
            overflowY: 'auto',
            backgroundColor: palette.surface,
            border: `1px solid ${palette.borderStrong}`,
            borderRadius: '8px',
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {isSearching ? (
            <div style={dropdownMessageStyle}>
              {t('reports.summary.searching_employees', 'Searching employees...')}
            </div>
          ) : employees.length === 0 ? (
            <div style={dropdownMessageStyle}>
              {t('reports.summary.no_employees_found', 'No employees found matching criteria.')}
            </div>
          ) : (
            employees.map((emp) => {
              const isSelected = emp.employeeId === selectedEmployeeId;
              const statusColors = emp.evaluationStatus ? palette.tones[getStatusTone(emp.evaluationStatus)] : null;
              return (
                <div
                  key={emp.employeeId}
                  onClick={() => handleSelect(emp)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${palette.border}`,
                    backgroundColor: isSelected ? palette.tones.info.bg : 'transparent',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = palette.tones.neutral.bg;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary, #3b82f6)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      {emp.fullName.charAt(0) || <User size={18} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: palette.textPrimary }}>
                        {resolveLocalizedText(emp.fullName)}
                        <span style={{ fontSize: '0.78rem', color: palette.textSecondary, marginLeft: '8px', fontWeight: 400 }}>
                          ({resolveLocalizedText(emp.employeeCode)})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: palette.textSecondary, marginTop: '2px' }}>
                        {resolveLocalizedText(emp.department?.name, t('reports.summary.no_department', 'No Dept'))} •{' '}
                        {resolveLocalizedText(emp.team?.name, t('reports.summary.no_team', 'No Team'))} •{' '}
                        {resolveLocalizedText(emp.role?.name, t('reports.summary.no_role', 'No Role'))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {emp.evaluationStatus && statusColors && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontWeight: 500,
                          backgroundColor: statusColors.bg,
                          color: statusColors.fg,
                        }}
                      >
                        {emp.evaluationStatus}
                      </span>
                    )}
                    {isSelected && <Check size={18} style={{ color: palette.tones.info.fg }} />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
