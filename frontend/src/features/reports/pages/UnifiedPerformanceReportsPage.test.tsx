/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { UnifiedPerformanceReportsPage } from './UnifiedPerformanceReportsPage';
import * as authContextModule from '@/shared/auth/auth-context';

vi.mock('@/shared/auth/auth-context', () => ({ useAuth: vi.fn() }));

const { stub } = vi.hoisted(() => ({
  stub:
    (name: string) =>
    ({ isEmbedded }: { isEmbedded?: boolean }) => (
      <div data-testid="tab-content">{`${name}:${isEmbedded ? 'embedded' : 'standalone'}`}</div>
    ),
}));
vi.mock('@/features/reports/pages/EmployeeReportPage', () => ({ EmployeeReportPage: stub('my') }));
vi.mock('@/features/reports/pages/TeamReportPage', () => ({ TeamReportPage: stub('team') }));
vi.mock('@/features/reports/pages/OrganizationReportPage', () => ({ OrganizationReportPage: stub('org') }));
vi.mock('@/features/reports/employee-kpi-summary/pages/KpiSummaryDashboardPage', () => ({
  KpiSummaryDashboardPage: stub('summary'),
}));

const LocationProbe = () => <div data-testid="location">{useLocation().search}</div>;

const renderHub = (role: string, search = '') => {
  vi.mocked(authContextModule.useAuth).mockReturnValue({
    user: { id: 'u1', email: 'u@kpi.com', role, employeeId: 'e1' },
    isAuthenticated: true,
  } as unknown as ReturnType<typeof authContextModule.useAuth>);

  render(
    <MemoryRouter initialEntries={[`/admin/reports${search}`]}>
      <Routes>
        <Route
          path="/admin/reports"
          element={
            <>
              <UnifiedPerformanceReportsPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

describe('UnifiedPerformanceReportsPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it.each([
    ['SYSTEM_ADMIN', ['Báo cáo của tôi', 'Báo cáo Đội nhóm', 'Báo cáo Toàn công ty', 'Bảng tổng hợp KPI']],
    ['HR_ADMIN', ['Báo cáo của tôi', 'Báo cáo Đội nhóm', 'Báo cáo Toàn công ty', 'Bảng tổng hợp KPI']],
    ['MANAGER', ['Báo cáo của tôi', 'Báo cáo Đội nhóm', 'Bảng tổng hợp KPI']],
    ['EMPLOYEE', ['Báo cáo của tôi', 'Bảng tổng hợp KPI']],
  ])('shows the tabs allowed for %s', (role, expected) => {
    renderHub(role);
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent ?? '');
    expect(tabs).toHaveLength(expected.length);
    expected.forEach((label, i) => expect(tabs[i]).toContain(label));
  });

  it('switches tabs through the scope query parameter and embeds the tab', () => {
    renderHub('HR_ADMIN', '?scope=my');
    expect(screen.getByTestId('tab-content')).toHaveTextContent('my:embedded');

    fireEvent.click(screen.getByRole('tab', { name: /Báo cáo Đội nhóm/ }));

    expect(screen.getByTestId('location')).toHaveTextContent('?scope=team');
    expect(screen.getByTestId('tab-content')).toHaveTextContent('team:embedded');
  });

  it('falls back to the first allowed tab for a scope the role cannot see', () => {
    renderHub('EMPLOYEE', '?scope=org');
    expect(screen.getByTestId('tab-content')).toHaveTextContent('my:embedded');
    expect(screen.getByRole('tab', { name: /Báo cáo của tôi/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows un-numbered tab labels and a readable role', () => {
    renderHub('HR_ADMIN');
    screen.getAllByRole('tab').forEach((tab) => expect(tab.textContent).not.toMatch(/^\s*\d+\./));
    expect(screen.getByText(/Account Scope: HR Admin/)).toBeInTheDocument();
    expect(screen.queryByText(/HR_ADMIN/)).not.toBeInTheDocument();
  });

  it('never describes the team tab as a ranking', () => {
    renderHub('HR_ADMIN', '?scope=team');
    expect(screen.queryByText(/ranking/i)).not.toBeInTheDocument();
  });
});
