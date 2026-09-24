import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { OrgEmployee } from '@/features/organization/domain/organization-models';
import { Badge } from '@/shared/ui/Badge/Badge';
import { COLORS } from '@/lib/theme';
import { useTheme } from '@/shared/theme';
import { getEmployeeReviewStatus, getReviewBadgeMeta } from '../domain/employee-review-status';
import { useIndividualCycleTranslation, useIsMobile } from '../hooks/use-individual-cycle-ui';

export const EMPLOYEE_PICKER_PAGE_SIZE = 10;

export interface IndividualEmployeePickerProps {
  employees: OrgEmployee[];
  selectedEmployeeIds: string[];
  onChange: (employeeIds: string[]) => void;
  /** Team display names keyed by team id. */
  teamNameById?: Map<string, string>;
  error?: string;
  disabled?: boolean;
}

const headerCellStyle: React.CSSProperties = { padding: '12px 16px', fontWeight: 600 };
const cellStyle: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle' };

const pagerButtonStyle = (isDisabled: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border-subtle)',
  backgroundColor: 'var(--bg-canvas)',
  color: isDisabled ? 'var(--text-muted)' : 'var(--text-primary)',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  fontSize: '0.85rem',
});

/** Employee selection table (search, select-page, paging) following the Employee Search table style. */
export const IndividualEmployeePicker: React.FC<IndividualEmployeePickerProps> = ({
  employees,
  selectedEmployeeIds,
  onChange,
  teamNameById,
  error,
  disabled = false,
}) => {
  const { t } = useIndividualCycleTranslation();
  const { isDark } = useTheme();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((employee) =>
      [employee.fullName, employee.employeeCode, employee.email].some((value) => value?.toLowerCase().includes(query))
    );
  }, [employees, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / EMPLOYEE_PICKER_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageEmployees = filteredEmployees.slice(
    (currentPage - 1) * EMPLOYEE_PICKER_PAGE_SIZE,
    currentPage * EMPLOYEE_PICKER_PAGE_SIZE
  );
  const pageIds = pageEmployees.map((employee) => employee.id);
  const isPageFullySelected = pageIds.length > 0 && pageIds.every((id) => selectedEmployeeIds.includes(id));
  const columnCount = isMobile ? 3 : 5;

  const accent = isDark ? '#A5B4FC' : '#4F46E5';
  const avatarBackground = isDark ? 'rgba(129, 140, 248, 0.2)' : '#4F46E51A';
  const selectedRowBackground = isDark ? 'rgba(129, 140, 248, 0.12)' : '#4F46E50D';

  const reviewLabel = (status: ReturnType<typeof getEmployeeReviewStatus>): string => {
    const days = status.daysUntilDue;
    switch (status.status) {
      case 'OVERDUE':
        return days === null
          ? t('ic_review_overdue', 'Overdue')
          : t('ic_review_overdue_days', '{days}d overdue', { days: Math.abs(days) });
      case 'UPCOMING':
        return days === 0 ? t('ic_review_due_today', 'Due today') : t('ic_review_due_in', 'Due in {days}d', { days: days ?? 0 });
      case 'NOT_DUE':
        return days === null ? t('ic_review_not_due', 'Not due') : t('ic_review_days_left', '{days}d left', { days });
      default:
        return t('ic_review_no_schedule', 'No schedule');
    }
  };

  const toggleEmployee = (employeeId: string) => {
    onChange(
      selectedEmployeeIds.includes(employeeId)
        ? selectedEmployeeIds.filter((id) => id !== employeeId)
        : [...selectedEmployeeIds, employeeId]
    );
  };

  const togglePage = () => {
    onChange(
      isPageFullySelected
        ? selectedEmployeeIds.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...selectedEmployeeIds, ...pageIds]))
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: isMobile ? '100%' : '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="search"
            aria-label={t('ic_search_placeholder', 'Search by name, code or email')}
            value={search}
            disabled={disabled}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t('ic_search_placeholder', 'Search by name, code or email')}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>{selectedEmployeeIds.length}</strong> {t('ic_selected', 'selected')}
          </span>
          {selectedEmployeeIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={disabled}
              style={{ border: 'none', background: 'transparent', color: accent, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {t('ic_clear_selection', 'Clear selection')}
            </button>
          )}
        </div>
      </div>

      <div style={{ border: `1px solid ${error ? COLORS.status.error : 'var(--border-subtle)'}`, borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ ...headerCellStyle, width: '44px' }}>
                  <input
                    type="checkbox"
                    aria-label={t('ic_select_page', 'Select all employees on this page')}
                    checked={isPageFullySelected}
                    disabled={disabled || pageIds.length === 0}
                    onChange={togglePage}
                  />
                </th>
                <th style={headerCellStyle}>{t('ic_col_employee', 'Employee')}</th>
                {!isMobile && <th style={headerCellStyle}>{t('ic_col_team', 'Team')}</th>}
                {!isMobile && <th style={headerCellStyle}>{t('ic_col_next_review', 'Next review')}</th>}
                <th style={headerCellStyle}>{t('ic_col_review_status', 'Review status')}</th>
              </tr>
            </thead>
            <tbody>
              {pageEmployees.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} style={{ ...cellStyle, padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {t('ic_no_match', 'No matching employees.')}
                  </td>
                </tr>
              ) : (
                pageEmployees.map((employee) => {
                  const reviewStatus = getEmployeeReviewStatus(employee);
                  const badgeMeta = getReviewBadgeMeta(reviewStatus.status, reviewStatus.daysUntilDue);
                  const isSelected = selectedEmployeeIds.includes(employee.id);
                  const teamName = employee.teamId ? teamNameById?.get(employee.teamId) : undefined;
                  return (
                    <tr
                      key={employee.id}
                      onClick={() => !disabled && toggleEmployee(employee.id)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? selectedRowBackground : 'transparent',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <td style={cellStyle} onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`${employee.fullName} (${employee.employeeCode})`}
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => toggleEmployee(employee.id)}
                        />
                      </td>
                      <td style={cellStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {!isMobile && (
                            <div
                              aria-hidden="true"
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                backgroundColor: avatarBackground,
                                color: accent,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                flexShrink: 0,
                              }}
                            >
                              {employee.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <span>{employee.employeeCode}</span>
                              <span>•</span>
                              <span style={{ wordBreak: 'break-all' }}>{isMobile ? teamName ?? '—' : employee.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      {!isMobile && (
                        <td style={cellStyle}>{teamName ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      )}
                      {!isMobile && (
                        <td style={{ ...cellStyle, color: 'var(--text-secondary)' }}>
                          {employee.nextReviewDueDate ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                      )}
                      <td style={cellStyle}>
                        <Badge variant={badgeMeta.variant}>{reviewLabel(reviewStatus)}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: isMobile ? 'center' : 'left' }}>
            {t('ic_page_label', 'Page')} {currentPage} {t('ic_of_label', 'of')} {totalPages} · {filteredEmployees.length}{' '}
            {t('ic_employees_label', 'employees')}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
            <button
              type="button"
              aria-label={t('ic_prev_btn', 'Previous')}
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              style={pagerButtonStyle(currentPage <= 1)}
            >
              <ChevronLeft size={16} /> {t('ic_prev_btn', 'Previous')}
            </button>
            <button
              type="button"
              aria-label={t('ic_next_btn', 'Next')}
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              style={pagerButtonStyle(currentPage >= totalPages)}
            >
              {t('ic_next_btn', 'Next')} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <span role="alert" style={{ color: COLORS.status.error, fontSize: '0.75rem' }}>
          {error}
        </span>
      )}
    </div>
  );
};
