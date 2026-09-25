/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeTable } from '../EmployeeTable';
import { employeeApi } from '../../api/employee-api';
import { organizationApi } from '../../api/organization-api';
import { useAuth } from '@/shared/auth/auth-context';
import type { AuthContextValue } from '@/shared/auth/auth-context';
import type { OrgEmployee } from '../../domain/organization-models';

vi.mock('../../api/employee-api', () => ({
  employeeApi: { getEmployees: vi.fn() },
}));

vi.mock('../../api/organization-api', () => ({
  organizationApi: { getJobRoles: vi.fn(), getJobLevels: vi.fn() },
}));

vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

const NOW = new Date('2026-01-01T00:00:00.000Z');

const employee: OrgEmployee = {
  id: 'emp-1',
  employeeCode: 'EMP001',
  fullName: 'Nguyen Van A',
  email: 'a@example.com',
  departmentId: 'dept-1',
  teamId: 'team-1',
  roleId: 'role-1',
  jobLevelId: 'lvl-1',
  managerId: null,
  employmentStatus: 'ACTIVE',
  joinDate: '2024-01-01',
  terminationDate: null,
  reviewCadenceOverrideId: null,
  // Late-evening UTC timestamp: re-parsing through Date in a +07:00 zone would show 2027-01-01.
  lastEvaluationCompletedAt: '2026-12-31T12:00:00.000Z',
  // Date-only value: re-parsing through Date in a negative-offset zone would show 2026-12-31.
  nextReviewDueDate: '2027-01-01',
  effectiveCadence: { id: 'cad-12', code: 'ANNUAL', name: 'Annual', intervalMonths: 12, source: 'JOB_LEVEL_DEFAULT' },
  version: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

describe('EmployeeTable review schedule columns', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u-1', email: 'm@example.com', name: 'Manager', role: 'MANAGER' },
      isAuthenticated: true,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    } as unknown as AuthContextValue);
    vi.mocked(employeeApi.getEmployees).mockResolvedValue([employee]);
    vi.mocked(organizationApi.getJobRoles).mockResolvedValue([]);
    vi.mocked(organizationApi.getJobLevels).mockResolvedValue([]);
  });

  it('TC74 shows effectiveCadence (name, interval, source) and renders dates without Date shifting', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <EmployeeTable />
      </QueryClientProvider>,
    );

    const row = (await screen.findByText('Nguyen Van A')).closest('tr') as HTMLTableRowElement;
    const cells = within(row);

    // Compact header; the full label stays available as a tooltip.
    expect(screen.getByRole('columnheader', { name: 'Cadence' })).toBeInTheDocument();
    expect(screen.getByTitle('Effective Review Cadence')).toBeInTheDocument();
    const cadenceBadge = cells.getByText('Annual (12 months)');
    expect(cadenceBadge).toBeInTheDocument();
    // Source is shown as the badge tooltip so the row stays on one line.
    expect(cadenceBadge).toHaveAttribute('title', 'Cadence Source: Job level default');
    expect(cells.getByText('2027-01-01')).toBeInTheDocument();
    expect(cells.getByText('2026-12-31')).toBeInTheDocument();
  });
});
