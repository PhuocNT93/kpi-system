/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeSearchPage } from '../EmployeeSearchPage';
import * as searchApiModule from '../../api/employee-search.api';
import * as orgApiModule from '../../api/organization-api';
import * as cycleApiModule from '../../../evaluation-cycles/api/cycle-api';

vi.mock('../../api/employee-search.api', () => ({
  employeeSearchApi: {
    search: vi.fn(),
  },
}));

vi.mock('../../api/organization-api', () => ({
  organizationApi: {
    getDepartments: vi.fn(),
    getTeams: vi.fn(),
    getJobRoles: vi.fn(),
    getJobLevels: vi.fn(),
  },
}));

vi.mock('../../../evaluation-cycles/api/cycle-api', () => ({
  evaluationCycleApi: {
    getCycles: vi.fn(),
  },
}));

describe('EmployeeSearchPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(orgApiModule.organizationApi.getDepartments).mockResolvedValue([
      { id: 'dept-1', name: 'Engineering', code: 'ENG' } as never,
    ]);
    vi.mocked(orgApiModule.organizationApi.getTeams).mockResolvedValue([
      { id: 'team-1', name: 'Backend', code: 'BE' } as never,
    ]);
    vi.mocked(orgApiModule.organizationApi.getJobRoles).mockResolvedValue([
      { id: 'role-1', name: 'Software Engineer', code: 'SE' } as never,
    ]);
    vi.mocked(orgApiModule.organizationApi.getJobLevels).mockResolvedValue([
      { id: 'level-1', name: 'Senior', code: 'SR', rank: 3 } as never,
    ]);
    vi.mocked(cycleApiModule.evaluationCycleApi.getCycles).mockResolvedValue([
      {
        id: 'cycle-1',
        name: '2026-H1 Review',
        code: '2026-H1',
        status: 'OPEN',
      } as never,
    ]);
  });

  it('renders employee search page with title, search input, and filters', async () => {
    vi.mocked(searchApiModule.employeeSearchApi.search).mockResolvedValue({
      employees: [
        {
          employeeId: 'emp-1',
          employeeCode: 'EMP-001',
          fullName: 'Nguyễn Văn An',
          email: 'an.nguyen@example.com',
          department: { id: 'dept-1', name: 'Engineering', code: 'ENG' },
          team: { id: 'team-1', name: 'Backend', code: 'BE' },
          role: { id: 'role-1', name: 'Software Engineer', code: 'SE' },
          jobLevel: { id: 'level-1', name: 'Senior', code: 'SR', rank: 3 },
          manager: { id: 'mgr-1', name: 'Trần Thị Bình', code: 'EMP-000' },
          employmentStatus: 'ACTIVE',
          evaluationStatus: 'APPROVED',
          evaluationId: 'eval-1',
          joinDate: '2024-01-10',
        },
      ],
      page: { number: 1, size: 20, total_items: 1, total_pages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EmployeeSearchPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Employee Directory & Search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/fuzzy search by full name/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText('EMP-001')).toBeInTheDocument();
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
      expect(screen.getByText('KPI Summary')).toBeInTheDocument();
    });
  });

  it('renders empty state when no employees match filters', async () => {
    vi.mocked(searchApiModule.employeeSearchApi.search).mockResolvedValue({
      employees: [],
      page: { number: 1, size: 20, total_items: 0, total_pages: 0 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EmployeeSearchPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No employees found')).toBeInTheDocument();
    });
  });
});
