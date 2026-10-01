import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { useReportPalette } from '../../hooks/use-report-palette';
import { useKpiSummaryQuery } from '../hooks/useKpiSummary';
import { EmployeeSearchBar } from '../components/EmployeeSearchBar';
import { EmployeeInfoCard } from '../components/EmployeeInfoCard';
import { ScoreSummaryCard } from '../components/ScoreSummaryCard';
import { KpiSummaryTable } from '../components/KpiSummaryTable';
import { KpiDetailPanel } from '../components/KpiDetailPanel';
import { KpiRelationshipDiagram } from '../components/KpiRelationshipDiagram';
import type { KpiItem } from '../types/kpi-summary.types';
import type { EmployeeSearchItem } from '../../../organization/api/employee-search.api';
import { ShieldAlert, AlertCircle, UserX, Loader2, ListChecks, Network } from 'lucide-react';
import { SubTabs } from '@/shared/ui/SubTabs/SubTabs';

type KpiSummaryView = 'items' | 'relationships';

interface KpiSummaryDashboardPageProps {
  isEmbedded?: boolean;
}

export const KpiSummaryDashboardPage: React.FC<KpiSummaryDashboardPageProps> = ({ isEmbedded = false }) => {
  const { employeeId: routeEmployeeId } = useParams<{ employeeId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useUiTranslation();
  const { isDark } = useTheme();
  const palette = useReportPalette();
  const dangerFg = isDark ? '#fca5a5' : '#dc2626';

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
  // In the hub the KPI table and the relationship diagram share the remaining height, one at a time.
  const [summaryView, setSummaryView] = useState<KpiSummaryView>('items');

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

  const cardStyle: React.CSSProperties = {
    backgroundColor: palette.surface,
    border: `1px solid ${palette.border}`,
    borderRadius: '10px',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isEmbedded ? '20px' : '24px',
        color: palette.textPrimary,
        boxSizing: 'border-box',
        ...(isEmbedded ? { width: '100%', flex: 1 } : { padding: '24px', minHeight: '100vh' }),
      }}
    >
      {!isEmbedded && (
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0', color: palette.textPrimary }}>
            {t('reports.summary.page_title', 'KPI Summary Dashboard')}
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: palette.textSecondary }}>
            {t(
              'reports.summary.page_description',
              'Comprehensive view of employee performance evaluations, official scores, criteria breakdowns, and organizational relationships.'
            )}
          </p>
        </div>
      )}

      <EmployeeSearchBar
        selectedEmployeeId={selectedEmployeeId}
        onSelectEmployee={handleSelectEmployee}
        currentUserRole={userRole}
        currentUserId={user?.id}
        selectedCycleId={selectedCycleId}
        onSelectCycle={handleSelectCycle}
      />

      {is403Forbidden && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '28px',
            textAlign: 'center',
          }}
        >
          <ShieldAlert size={44} style={{ color: dangerFg, margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 700, color: dangerFg }}>
            {t('reports.summary.access_restricted_title', 'Access Restricted')}
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: palette.textSecondary, maxWidth: '480px', marginInline: 'auto' }}>
            {t(
              'reports.summary.access_restricted_description',
              'You do not have permission to view this employee evaluation. Please contact your manager or system administrator if you believe this is an error.'
            )}
          </p>
          {requestId && (
            <div style={{ marginTop: '12px', fontSize: '0.75rem', color: palette.textSecondary, fontFamily: 'monospace' }}>
              {t('reports.summary.reference_id', 'Reference ID: {id}', { id: requestId })}
            </div>
          )}
        </div>
      )}

      {isError && !is403Forbidden && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <AlertCircle size={24} style={{ color: dangerFg, flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: dangerFg }}>
              {t('reports.summary.load_error_title', 'Error Retrieving KPI Summary')}
            </h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: palette.textSecondary }}>
              {error?.message ||
                t('reports.summary.load_error_description', 'An unexpected error occurred while loading evaluation records.')}
            </p>
            {requestId && (
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: palette.textSecondary, fontFamily: 'monospace' }}>
                {t('reports.summary.diagnostic_id', 'Diagnostic ID: {id}', { id: requestId })}
              </div>
            )}
            <button
              onClick={() => refetch()}
              style={{
                marginTop: '12px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: `1px solid ${dangerFg}`,
                backgroundColor: 'transparent',
                color: dangerFg,
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('reports.summary.retry', 'Retry')}
            </button>
          </div>
        </div>
      )}

      {!selectedEmployeeId && !isLoading && !isError && (
        <div
          style={{
            ...cardStyle,
            padding: '48px 24px',
            textAlign: 'center',
            color: palette.textSecondary,
          }}
        >
          <UserX size={44} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 600, color: palette.textPrimary }}>
            {t('reports.summary.no_employee_title', 'No Employee Selected')}
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', maxWidth: '420px', marginInline: 'auto' }}>
            {t(
              'reports.summary.no_employee_description',
              'Use the search bar above to search by name, code, or department, and select an employee to inspect their KPI summary.'
            )}
          </p>
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              ...cardStyle,
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: palette.tones.info.fg }} />
            <span style={{ fontSize: '0.9rem', color: palette.textSecondary }}>
              {t('reports.summary.loading_summary', 'Loading employee evaluation summary...')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  ...cardStyle,
                  height: '110px',
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {summary && !isLoading && !isError && (
        <>
          <EmployeeInfoCard employee={summary.employee} evaluation={summary.evaluation} />

          <ScoreSummaryCard scoreSummary={summary.scoreSummary} />

          {isEmbedded && (
            <SubTabs<KpiSummaryView>
              ariaLabel={t('reports.summary.kpi_items_title', 'KPI Evaluation Items')}
              value={summaryView}
              onChange={setSummaryView}
              items={[
                { id: 'items', label: t('reports.summary.subtab.items', 'KPI Items'), icon: <ListChecks size={16} /> },
                { id: 'relationships', label: t('reports.summary.subtab.relationships', 'Relationships'), icon: <Network size={16} /> },
              ]}
            />
          )}

          {(!isEmbedded || summaryView === 'items') && (
            <KpiSummaryTable
              kpis={summary.kpis}
              selectedKpiId={selectedKpi?.evaluationItemId || null}
              onSelectKpi={(kpi) => setSelectedKpi(kpi)}
              isScrollable={isEmbedded}
            />
          )}

          {(!isEmbedded || summaryView === 'relationships') && (
            <div className={isEmbedded ? 'table-scroll-frame' : undefined}>
              <KpiRelationshipDiagram
                employee={summary.employee}
                evaluation={summary.evaluation}
                kpis={summary.kpis}
                relationships={summary.relationships}
              />
            </div>
          )}

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
