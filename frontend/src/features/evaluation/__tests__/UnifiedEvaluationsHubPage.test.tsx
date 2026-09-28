/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedEvaluationsHubPage } from '../pages/UnifiedEvaluationsHubPage';
import { ThemeProvider } from '@/shared/theme';
import { AuthContext, type AuthContextValue } from '@/shared/auth/auth-context';

vi.mock('../pages/MyEvaluationPage', () => ({
  MyEvaluationPage: () => <div data-testid="mock-my-evaluation-page">My Evaluation Content</div>,
}));

vi.mock('../pages/TeamEvaluationsPage', () => ({
  TeamEvaluationsPage: () => <div data-testid="mock-team-evaluation-page">Team Reviews Content</div>,
}));

vi.mock('@/features/organization/pages/EmployeeSearchPage', () => ({
  EmployeeSearchPage: () => <div data-testid="mock-employee-search-page">Employee Search Content</div>,
}));

const createMockAuth = (user: AuthContextValue['user']): AuthContextValue => ({
  user,
  isAuthenticated: !!user,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
});

describe('UnifiedEvaluationsHubPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders My Evaluations by default and renders all 3 tabs for MANAGER', () => {
    const managerUser = {
      id: 'mgr-1',
      name: 'Team Manager',
      email: 'manager@company.com',
      role: 'MANAGER' as const,
    };

    render(
      <AuthContext.Provider value={createMockAuth(managerUser)}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/admin/evaluations']}>
            <UnifiedEvaluationsHubPage />
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Đánh giá của tôi')).toBeInTheDocument();
    expect(screen.getByText('Đánh giá đội nhóm')).toBeInTheDocument();
    expect(screen.getByText('Tra cứu nhân sự')).toBeInTheDocument();
    expect(screen.getByTestId('mock-my-evaluation-page')).toBeInTheDocument();
  });

  it('switches to search tab when clicking Tra cứu nhân sự tab', () => {
    const managerUser = {
      id: 'mgr-1',
      name: 'Team Manager',
      email: 'manager@company.com',
      role: 'MANAGER' as const,
    };

    render(
      <AuthContext.Provider value={createMockAuth(managerUser)}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/admin/evaluations']}>
            <UnifiedEvaluationsHubPage />
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    );

    const searchTabBtn = screen.getByText('Tra cứu nhân sự').closest('button');
    expect(searchTabBtn).not.toBeNull();
    fireEvent.click(searchTabBtn!);

    expect(screen.getByTestId('mock-employee-search-page')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-my-evaluation-page')).not.toBeInTheDocument();
  });

  it('renders search tab directly when initial URL contains ?tab=search', () => {
    const managerUser = {
      id: 'mgr-1',
      name: 'Team Manager',
      email: 'manager@company.com',
      role: 'MANAGER' as const,
    };

    render(
      <AuthContext.Provider value={createMockAuth(managerUser)}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/admin/evaluations?tab=search']}>
            <UnifiedEvaluationsHubPage />
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('mock-employee-search-page')).toBeInTheDocument();
  });

  it('renders ONLY My Evaluations for EMPLOYEE role', () => {
    const employeeUser = {
      id: 'emp-1',
      name: 'Regular Employee',
      email: 'emp@company.com',
      role: 'EMPLOYEE' as const,
    };

    render(
      <AuthContext.Provider value={createMockAuth(employeeUser)}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/admin/evaluations?tab=search']}>
            <UnifiedEvaluationsHubPage />
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Đánh giá của tôi')).toBeInTheDocument();
    expect(screen.queryByText('Đánh giá đội nhóm')).not.toBeInTheDocument();
    expect(screen.queryByText('Tra cứu nhân sự')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-my-evaluation-page')).toBeInTheDocument();
  });
});
