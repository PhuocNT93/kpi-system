import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { OrgEmployee } from '@/features/organization/domain/organization-models';
import { Badge } from '@/shared/ui/Badge/Badge';
import { COLORS } from '@/lib/theme';
import { getEmployeeReviewStatus, getReviewBadgeMeta } from '../domain/employee-review-status';

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
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="search"
            aria-label="Search employees"
            value={search}
            disabled={disabled}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name, code or email"
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
            <strong style={{ color: 'var(--text-primary)' }}>{selectedEmployeeIds.length}</strong> selected
          </span>
          {selectedEmployeeIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={disabled}
              style={{ border: 'none', background: 'transparent', color: COLORS.primary.DEFAULT, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Clear selection
            </button>
          )}
        </div>
      </div>

      <div style={{ border: `1px solid ${error ? COLORS.status.error : 'var(--border-subtle)'}`, borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
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
                    aria-label="Select all employees on this page"
                    checked={isPageFullySelected}
                    disabled={disabled || pageIds.length === 0}
                    onChange={togglePage}
                  />
                </th>
                <th style={headerCellStyle}>Employee</th>
                <th style={headerCellStyle}>Team</th>
                <th style={headerCellStyle}>Next review</th>
                <th style={headerCellStyle}>Review status</th>
              </tr>
            </thead>
            <tbody>
              {pageEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...cellStyle, padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No matching employees.
                  </td>
                </tr>
              ) : (
                pageEmployees.map((employee) => {
                  const reviewStatus = getEmployeeReviewStatus(employee);
                  const badgeMeta = getReviewBadgeMeta(reviewStatus.status, reviewStatus.daysUntilDue);
                  const isSelected = selectedEmployeeIds.includes(employee.id);
                  return (
                    <tr
                      key={employee.id}
                      onClick={() => !disabled && toggleEmployee(employee.id)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? '#4F46E50D' : 'transparent',
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
                          <div
                            aria-hidden="true"
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: '#4F46E51A',
                              color: '#4F46E5',
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
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <span>{employee.employeeCode}</span>
                              <span>•</span>
                              <span>{employee.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...cellStyle, color: 'var(--text-primary)' }}>
                        {(employee.teamId && teamNameById?.get(employee.teamId)) || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ ...cellStyle, color: 'var(--text-secondary)' }}>
                        {employee.nextReviewDueDate ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={cellStyle}>
                        <Badge variant={badgeMeta.variant}>{badgeMeta.label}</Badge>
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
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Page {currentPage} of {totalPages} · {filteredEmployees.length} employees
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              aria-label="Previous employees page"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              style={pagerButtonStyle(currentPage <= 1)}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              type="button"
              aria-label="Next employees page"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              style={pagerButtonStyle(currentPage >= totalPages)}
            >
              Next <ChevronRight size={16} />
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
