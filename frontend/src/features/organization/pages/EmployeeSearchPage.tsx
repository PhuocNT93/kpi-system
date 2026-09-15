import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Award,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useEmployeeSearch } from '../hooks/useEmployeeSearch';
import { useDepartments } from '../hooks/useDepartments';
import { useTeams } from '../hooks/useTeams';
import { useJobRoles } from '../hooks/useJobRoles';
import { useJobLevels } from '../hooks/useJobLevels';
import { useEvaluationCyclesQuery } from '../../evaluation-cycles/hooks/use-evaluation-cycles';

export function EmployeeSearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Local filter states initialized from URL search params
  const [qInput, setQInput] = useState(searchParams.get('q') || '');
  const [qDebounced, setQDebounced] = useState(searchParams.get('q') || '');
  const [employeeId, setEmployeeId] = useState(searchParams.get('employee_id') || '');
  const [department, setDepartment] = useState(searchParams.get('department') || '');
  const [team, setTeam] = useState(searchParams.get('team') || '');
  const [role, setRole] = useState(searchParams.get('role') || '');
  const [jobLevel, setJobLevel] = useState(searchParams.get('job_level') || '');
  const [evaluationCycle, setEvaluationCycle] = useState(searchParams.get('evaluation_cycle') || '');
  const [evaluationStatus, setEvaluationStatus] = useState(searchParams.get('evaluation_status') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [size, setSize] = useState(Number(searchParams.get('size')) || 20);

  // Debounce search query input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setQDebounced(qInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [qInput]);

  // Sync state changes back to URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (qDebounced) params.set('q', qDebounced);
    if (employeeId) params.set('employee_id', employeeId);
    if (department) params.set('department', department);
    if (team) params.set('team', team);
    if (role) params.set('role', role);
    if (jobLevel) params.set('job_level', jobLevel);
    if (evaluationCycle) params.set('evaluation_cycle', evaluationCycle);
    if (evaluationStatus) params.set('evaluation_status', evaluationStatus);
    if (page > 1) params.set('page', String(page));
    if (size !== 20) params.set('size', String(size));

    setSearchParams(params, { replace: true });
  }, [qDebounced, employeeId, department, team, role, jobLevel, evaluationCycle, evaluationStatus, page, size, setSearchParams]);

  // Fetch dropdown reference data
  const { data: departments = [] } = useDepartments();
  const { data: teams = [] } = useTeams();
  const { data: roles = [] } = useJobRoles();
  const { data: jobLevels = [] } = useJobLevels();
  const { data: cycleData } = useEvaluationCyclesQuery();
  const cycles = Array.isArray(cycleData) ? cycleData : [];

  // Query employees
  const { data, isLoading, isError, error, refetch, isFetching } = useEmployeeSearch({
    q: qDebounced || undefined,
    employeeId: employeeId || undefined,
    department: department || undefined,
    team: team || undefined,
    role: role || undefined,
    jobLevel: jobLevel || undefined,
    evaluationCycle: evaluationCycle || undefined,
    evaluationStatus: evaluationStatus || undefined,
    page,
    size,
  });

  const employees = data?.employees || [];
  const pageMeta = data?.page || { number: page, size, total_items: 0, total_pages: 1 };

  const handleResetFilters = () => {
    setQInput('');
    setQDebounced('');
    setEmployeeId('');
    setDepartment('');
    setTeam('');
    setRole('');
    setJobLevel('');
    setEvaluationCycle('');
    setEvaluationStatus('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    qDebounced || employeeId || department || team || role || jobLevel || evaluationCycle || evaluationStatus
  );

  const getStatusBadgeColor = (status?: string | null) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', border: '#10B98133' };
      case 'REVIEWING':
      case 'SUBMITTED':
        return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', border: '#3B82F633' };
      case 'DRAFT':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: '#F59E0B33' };
      case 'REJECTED':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444', border: '#EF444433' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.1)', text: '#6B7280', border: '#6B728033' };
    }
  };

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '1440px',
        margin: '0 auto',
        color: 'var(--text-primary)',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
              Employee Directory & Search
            </h1>
            <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Search across employees with multi-criteria filters, Vietnamese diacritic & typo-tolerant fuzzy matching.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              cursor: isFetching ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Filter size={18} style={{ color: '#4F46E5' }} />
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Search & Filter Criteria</span>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                color: '#EF4444',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <X size={14} /> Clear all filters
            </button>
          )}
        </div>

        {/* Free text search bar */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
              display: 'flex',
            }}
          >
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Fuzzy search by full name, Vietnamese diacritics (e.g. 'Nguyễn' or 'Nguyen'), employee code, or email..."
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 40px 10px 38px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-canvas)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          {qInput && (
            <button
              onClick={() => setQInput('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Multi-filter row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {/* Department Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Department
            </label>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d: { id: string; name: string; code: string }) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Team
            </label>
            <select
              value={team}
              onChange={(e) => {
                setTeam(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="">All Teams</option>
              {teams.map((t: { id: string; name: string; code: string }) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Job Role
            </label>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="">All Roles</option>
              {roles.map((r: { id: string; name: string; code: string }) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          {/* Job Level Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Job Level
            </label>
            <select
              value={jobLevel}
              onChange={(e) => {
                setJobLevel(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="">All Levels</option>
              {jobLevels.map((l: { id: string; name: string; code: string }) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>

          {/* Evaluation Cycle Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Evaluation Cycle
            </label>
            <select
              value={evaluationCycle}
              onChange={(e) => {
                setEvaluationCycle(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="">All Cycles</option>
              {cycles.map((c: { id?: string; evaluation_cycle_id?: string; name?: string; code?: string }) => (
                <option key={c.id || c.evaluation_cycle_id} value={c.id || c.evaluation_cycle_id}>
                  {c.name || c.code}
                </option>
              ))}
            </select>
          </div>

          {/* Evaluation Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Evaluation Status
            </label>
            <select
              value={evaluationStatus}
              onChange={(e) => {
                setEvaluationStatus(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="REVIEWING">Reviewing</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Results Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Showing{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {employees.length > 0 ? (page - 1) * size + 1 : 0} -{' '}
              {Math.min(page * size, pageMeta.total_items)}
            </strong>{' '}
            of <strong style={{ color: 'var(--text-primary)' }}>{pageMeta.total_items}</strong> employees
          </div>

          {/* Page size picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rows per page:</span>
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', marginBottom: '12px' }}>
              <RefreshCw size={28} className="animate-spin" style={{ color: '#4F46E5' }} />
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Loading matching employees...
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <AlertCircle size={36} style={{ color: '#EF4444', margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Failed to retrieve employees</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {(error as Error)?.message || 'An unexpected error occurred while searching.'}
            </p>
            <button
              onClick={() => refetch()}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#4F46E5',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && employees.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                color: 'var(--text-secondary)',
              }}
            >
              <User size={28} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>No employees found</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              We couldn't find any employees matching your current filter criteria. Try clearing search or relaxing filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}

        {/* Data Table */}
        {!isLoading && !isError && employees.length > 0 && (
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
                  <th style={{ padding: '12px 20px' }}>Employee</th>
                  <th style={{ padding: '12px 16px' }}>Department & Team</th>
                  <th style={{ padding: '12px 16px' }}>Role & Level</th>
                  <th style={{ padding: '12px 16px' }}>Manager</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const statusStyle = getStatusBadgeColor(emp.evaluationStatus);
                  return (
                    <tr
                      key={emp.employeeId}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Name & Code */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: '#4F46E51A',
                              color: '#4F46E5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {emp.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {emp.fullName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                              <span>{emp.employeeCode}</span>
                              <span>•</span>
                              <span>{emp.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Team */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {emp.department?.name || '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {emp.team?.name ? `Team: ${emp.team.name}` : 'No team assigned'}
                        </div>
                      </td>

                      {/* Role & Level */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {emp.role?.name || '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {emp.jobLevel?.name || '—'}
                        </div>
                      </td>

                      {/* Manager */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {emp.manager?.name ? (
                          <span>{emp.manager.name}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Evaluation Status */}
                      <td style={{ padding: '14px 16px' }}>
                        {emp.evaluationStatus ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.text,
                              border: `1px solid ${statusStyle.border}`,
                            }}
                          >
                            {emp.evaluationStatus}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            No evaluation
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            const cycleParam = evaluationCycle || (cycles[0]?.id ? String(cycles[0].id) : '');
                            const query = cycleParam ? `?evaluation_cycle_id=${cycleParam}` : '';
                            navigate(`/admin/employees/${emp.employeeId}/kpi-summary${query}`);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #4F46E5',
                            backgroundColor: 'transparent',
                            color: '#4F46E5',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#4F46E5';
                            e.currentTarget.style.color = '#FFFFFF';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#4F46E5';
                          }}
                        >
                          <Award size={14} />
                          KPI Summary
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && employees.length > 0 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Page {pageMeta.number} of {Math.max(1, pageMeta.total_pages)}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-canvas)',
                  color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                disabled={page >= pageMeta.total_pages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-canvas)',
                  color: page >= pageMeta.total_pages ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: page >= pageMeta.total_pages ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
