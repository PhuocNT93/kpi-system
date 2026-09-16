import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { useKpiSummaryQuery } from '../hooks/useKpiSummary';
import { EmployeeSearchBar } from '../components/EmployeeSearchBar';
import { EmployeeInfoCard } from '../components/EmployeeInfoCard';
import { ScoreSummaryCard } from '../components/ScoreSummaryCard';
import { KpiSummaryTable } from '../components/KpiSummaryTable';
import { KpiDetailPanel } from '../components/KpiDetailPanel';
import { KpiRelationshipDiagram } from '../components/KpiRelationshipDiagram';
import type { KpiItem } from '../types/kpi-summary.types';
import type { EmployeeSearchItem } from '../../../organization/api/employee-search.api';
import { ShieldAlert, AlertCircle, UserX, Loader2 } from 'lucide-react';

export const KpiSummaryDashboardPage: React.FC = () => {
  const { employeeId: routeEmployeeId } = useParams<{ employeeId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userRole = user?.role || 'EMPLOYEE';
  const isEmployeeRole = userRole === 'EMPLOYEE';

  // Initial employee ID determination
  const initialEmpId = routeEmployeeId || (isEmployeeRole ? (user?.employeeId || 'me') : '');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmpId);

  // Cycle selection from query param
  const cycleParam = searchParams.get('evaluation_cycle_id') || searchParams.get('cycleId') || '';
  const [selectedCycleId, setSelectedCycleId] = useState<string>(cycleParam);

  // Selected KPI for drill-down panel
  const [selectedKpi, setSelectedKpi] = useState<KpiItem | null>(null);

  // Keep state synced with route param
  useEffect(() => {
    if (routeEmployeeId && routeEmployeeId !== selectedEmployeeId) {
      setSelectedEmployeeId(routeEmployeeId);
    } else if (!routeEmployeeId && isEmployeeRole && user?.employeeId) {
      setSelectedEmployeeId(user.employeeId);
    }
  }, [routeEmployeeId, selectedEmployeeId, isEmployeeRole, user?.employeeId]);

  // Query KPI summary
  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
  } = useKpiSummaryQuery(
    {
      employeeId: selectedEmployeeId,
      evaluationCycleId: selectedCycleId || undefined,
    },
    { enabled: Boolean(selectedEmployeeId) }
  );

  const handleSelectEmployee = (emp: EmployeeSearchItem) => {
    setSelectedEmployeeId(emp.employeeId);
    navigate(`/reports/employees/${emp.employeeId}/kpi-summary${selectedCycleId ? `?evaluation_cycle_id=${selectedCycleId}` : ''}`, {
      replace: true,
    });
  };

  const handleSelectCycle = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (cycleId) next.set('evaluation_cycle_id', cycleId);
        else next.delete('evaluation_cycle_id');
        return next;
      },
      { replace: true }
    );
  };

  interface ApiErrorLike {
    status?: number;
    statusCode?: number;
    code?: string;
    message?: string;
    requestId?: string;
    meta?: { request_id?: string };
  }

  const apiError = error as unknown as ApiErrorLike | null;

  // Check for 403 Forbidden
  const is403Forbidden =
    apiError?.status === 403 ||
    apiError?.statusCode === 403 ||
    apiError?.code === 'FORBIDDEN' ||
    apiError?.message?.toLowerCase().includes('do not have access') ||
    apiError?.message?.toLowerCase().includes('permission');

  const requestId = apiError?.requestId || apiError?.meta?.request_id;

  return (
    <div
      style={{
        padding: '24px',
        minHeight: '100vh',
        color: 'var(--text-primary)',
        boxSizing: 'border-box',
      }}
    >
      {/* Dashboard Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          KPI Summary Dashboard
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Comprehensive view of employee performance evaluations, official scores, criteria breakdowns, and organizational relationships.
        </p>
      </div>

      {/* 1. Employee Search & Filter Bar */}
      <EmployeeSearchBar
        selectedEmployeeId={selectedEmployeeId}
        onSelectEmployee={handleSelectEmployee}
        currentUserRole={userRole}
        currentUserId={user?.id}
        selectedCycleId={selectedCycleId}
        onSelectCycle={handleSelectCycle}
      />

      {/* State: 403 Forbidden / Permission Violation */}
      {is403Forbidden && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '28px',
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          <ShieldAlert size={44} style={{ color: '#dc2626', margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 700, color: '#dc2626' }}>
            Access Restricted
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '480px', marginInline: 'auto' }}>
            You do not have permission to view this employee evaluation. Please contact your manager or system administrator if you believe this is an error.
          </p>
          {requestId && (
            <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              Reference ID: {requestId}
            </div>
          )}
        </div>
      )}

      {/* State: Other Server Errors */}
      {isError && !is403Forbidden && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <AlertCircle size={24} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>
              Error Retrieving KPI Summary
            </h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {error?.message || 'An unexpected error occurred while loading evaluation records.'}
            </p>
            {requestId && (
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                Diagnostic ID: {requestId}
              </div>
            )}
            <button
              onClick={() => refetch()}
              style={{
                marginTop: '12px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #dc2626',
                backgroundColor: 'transparent',
                color: '#dc2626',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* State: No Employee Selected */}
      {!selectedEmployeeId && !isLoading && !isError && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <UserX size={44} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            No Employee Selected
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', maxWidth: '420px', marginInline: 'auto' }}>
            Use the search bar above to search by name, code, or department, and select an employee to inspect their KPI summary.
          </p>
        </div>
      )}

      {/* State: Loading Skeleton */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Skeleton Info Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary, #3b82f6)' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Loading employee evaluation summary...
            </span>
          </div>

          {/* Skeleton Score Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  height: '110px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* State: Data Loaded Successfully */}
      {summary && !isLoading && !isError && (
        <>
          {/* 2. Employee Information Card */}
          <EmployeeInfoCard employee={summary.employee} evaluation={summary.evaluation} />

          {/* 3. Score Summary Card */}
          <ScoreSummaryCard scoreSummary={summary.scoreSummary} />

          {/* 4. KPI Summary Table */}
          <KpiSummaryTable
            kpis={summary.kpis}
            selectedKpiId={selectedKpi?.evaluationItemId || null}
            onSelectKpi={(kpi) => setSelectedKpi(kpi)}
          />

          {/* 5. Relationship Diagram */}
          <KpiRelationshipDiagram
            employee={summary.employee}
            evaluation={summary.evaluation}
            kpis={summary.kpis}
            relationships={summary.relationships}
          />

          {/* 6. KPI Detail Drill-down Slide-out Panel */}
          {selectedKpi && (
            <KpiDetailPanel
              employeeId={summary.employee.employeeId}
              evaluationItemId={selectedKpi.evaluationItemId}
              onClose={() => setSelectedKpi(null)}
            />
          )}
        </>
      )}
    </div>
  );
};
