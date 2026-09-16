import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, ChevronDown, Check, User } from 'lucide-react';
import { useEmployeeSearch } from '../../../organization/hooks/useEmployeeSearch';
import type { EmployeeSearchItem } from '../../../organization/api/employee-search.api';
import { useEvaluationCyclesQuery } from '../../../evaluation-cycles/hooks/use-evaluation-cycles';
import { resolveLocalizedText } from '../api/kpi-summary.api';

interface EmployeeSearchBarProps {
  selectedEmployeeId: string | null;
  onSelectEmployee: (emp: EmployeeSearchItem) => void;
  currentUserRole?: string;
  currentUserId?: string;
  selectedCycleId?: string;
  onSelectCycle?: (cycleId: string) => void;
}

export const EmployeeSearchBar: React.FC<EmployeeSearchBarProps> = ({
  selectedEmployeeId,
  onSelectEmployee,
  currentUserRole,
  selectedCycleId,
  onSelectCycle,
}) => {
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

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search input with debouncing */}
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
            }}
          />
          <input
            type="text"
            placeholder={
              isEmployeeRole
                ? 'Your profile is selected'
                : 'Search employee by name (supports Vietnamese diacritics), code, email...'
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
              border: '1px solid var(--border-subtle)',
              backgroundColor: isEmployeeRole ? 'var(--bg-muted, rgba(0,0,0,0.03))' : 'var(--bg-card, #fff)',
              color: 'var(--text-primary)',
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
                color: 'var(--text-secondary)',
                padding: '4px',
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Cycle selector */}
        {cycles.length > 0 && onSelectCycle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Cycle:</span>
            <select
              value={selectedCycleId || ''}
              onChange={(e) => onSelectCycle(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
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

        {/* Filter Toggle Button */}
        {!isEmployeeRole && (
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: `1px solid ${hasActiveFilters ? 'var(--primary, #3b82f6)' : 'var(--border-subtle)'}`,
              backgroundColor: hasActiveFilters ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface)',
              color: hasActiveFilters ? 'var(--primary, #3b82f6)' : 'var(--text-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Filter size={16} />
            Filters
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

      {/* Expanded Filter Panel */}
      {isFilterOpen && !isEmployeeRole && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Department
            </label>
            <input
              type="text"
              placeholder="e.g. Engineering"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Team
            </label>
            <input
              type="text"
              placeholder="e.g. Backend"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Role
            </label>
            <input
              type="text"
              placeholder="e.g. Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Status
            </label>
            <select
              value={evaluationStatus}
              onChange={(e) => setEvaluationStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="REVIEWING">REVIEWING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="LOCKED">LOCKED</option>
            </select>
          </div>

          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={handleClearFilters}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Autocomplete Dropdown List */}
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
            backgroundColor: 'var(--bg-surface, #fff)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {isSearching ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Searching employees...
            </div>
          ) : employees.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              No employees found matching criteria.
            </div>
          ) : (
            employees.map((emp) => {
              const isSelected = emp.employeeId === selectedEmployeeId;
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
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(0,0,0,0.03))';
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
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {resolveLocalizedText(emp.fullName)}
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '8px', fontWeight: 400 }}>
                          ({resolveLocalizedText(emp.employeeCode)})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {resolveLocalizedText(emp.department?.name, 'No Dept')} • {resolveLocalizedText(emp.team?.name, 'No Team')} • {resolveLocalizedText(emp.role?.name, 'No Role')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {emp.evaluationStatus && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontWeight: 500,
                          backgroundColor: emp.evaluationStatus === 'PUBLISHED' || emp.evaluationStatus === 'APPROVED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: emp.evaluationStatus === 'PUBLISHED' || emp.evaluationStatus === 'APPROVED' ? '#059669' : '#d97706',
                        }}
                      >
                        {emp.evaluationStatus}
                      </span>
                    )}
                    {isSelected && <Check size={18} style={{ color: 'var(--primary, #3b82f6)' }} />}
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
