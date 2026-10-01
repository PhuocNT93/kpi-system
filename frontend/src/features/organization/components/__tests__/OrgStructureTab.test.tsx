/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrgStructureTab } from '../OrgStructureTab';

const ENGINEERING_ID = vi.hoisted(() => 'd1000000-0000-4000-8000-000000000001');

vi.mock('../../../../shared/auth/auth-context', () => ({ useAuth: () => ({ user: { role: 'HR_ADMIN' } }) }));
vi.mock('../../hooks/useDepartments', () => ({
  useDepartments: () => ({
    isPending: false,
    isError: false,
    data: [
      // The first seeded department is expanded by default, so its teams are visible in the tree.
      { id: ENGINEERING_ID, name: 'Engineering' },
      { id: 'dept-b', name: 'Finance' },
    ],
  }),
}));
vi.mock('../../hooks/useTeams', () => ({
  useTeams: () => ({
    isPending: false,
    isError: false,
    data: [{ id: 'team-1', name: 'Platform', departmentId: ENGINEERING_ID }],
  }),
}));
vi.mock('../../api/formula-api', () => ({ formulaApi: { getFormulasSummary: () => Promise.resolve([]) } }));
vi.mock('../DepartmentTable', () => ({
  DepartmentTable: ({ createControl }: { createControl?: { isOpen: boolean } }) => (
    <div>department-table{createControl?.isOpen ? ':create-open' : ''}</div>
  ),
}));
vi.mock('../TeamTable', () => ({ TeamTable: () => <div>team-table</div> }));
vi.mock('../EmployeeTable', () => ({
  EmployeeTable: ({ departmentId, teamId }: { departmentId?: string; teamId?: string }) => (
    <div>employee-table:{teamId ?? departmentId ?? 'all'}</div>
  ),
}));
vi.mock('../TeamFormulaBuilderTab', () => ({ TeamFormulaBuilderTab: () => <div>formula-builder</div> }));

const renderTab = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <OrgStructureTab />
    </QueryClientProvider>
  );

const tabNames = () =>
  within(screen.getByRole('tablist'))
    .getAllByRole('tab')
    .map((tab) => tab.textContent);
const selectTreeNode = (name: string) => fireEvent.click(screen.getAllByText(name)[0]);

describe('OrgStructureTab sub-tabs', () => {
  afterEach(() => cleanup());

  it('TC40: shows one table at a time on the root level', () => {
    renderTab();

    expect(tabNames()).toEqual(['Departments', 'Employees']);
    // The root title must not repeat a sub-tab name.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Organization Overview');
    expect(screen.getByRole('tab', { name: 'Departments' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('department-table')).toBeInTheDocument();
    expect(screen.queryByText('employee-table:all')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Employees' }));
    expect(screen.getByText('employee-table:all')).toBeInTheDocument();
    expect(screen.queryByText('department-table')).not.toBeInTheDocument();
  });

  it('TC41: offers Teams, Employees and Formula for a department', () => {
    renderTab();
    selectTreeNode('Engineering');

    expect(tabNames()).toEqual(['Teams', 'Employees', 'Evaluation Formula']);
    expect(screen.getByText('team-table')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Employees' }));
    expect(screen.getByRole('tab', { name: 'Employees' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(`employee-table:${ENGINEERING_ID}`)).toBeInTheDocument();
    expect(screen.queryByText('team-table')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Evaluation Formula' }));
    expect(screen.getByText('formula-builder')).toBeInTheDocument();
    expect(screen.queryByText(`employee-table:${ENGINEERING_ID}`)).not.toBeInTheDocument();
  });

  it('TC42: offers Members and Formula for a team', () => {
    renderTab();
    selectTreeNode('Platform');

    expect(tabNames()).toEqual(['Members', 'Evaluation Formula']);
    expect(screen.getByText('employee-table:team-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Evaluation Formula' }));
    expect(screen.getByText('formula-builder')).toBeInTheDocument();
  });

  it('TC43: keeps the chosen sub-tab when the selection changes and falls back when it does not exist', () => {
    renderTab();
    selectTreeNode('Engineering');
    fireEvent.click(screen.getByRole('tab', { name: 'Employees' }));

    selectTreeNode('Finance');
    expect(screen.getByRole('tab', { name: 'Employees' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('employee-table:dept-b')).toBeInTheDocument();

    selectTreeNode('Platform');
    expect(screen.getByRole('tab', { name: 'Members' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('employee-table:team-1')).toBeInTheDocument();
  });

  it('TC47: has no hard-coded Vietnamese sub-tab labels', () => {
    renderTab();
    selectTreeNode('Platform');

    expect(screen.queryByText(/Thành viên nhóm/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Công thức đánh giá riêng/)).not.toBeInTheDocument();
  });

  it('shows the create button of the active sub-tab in the sub-tab row and hides it for formulas', () => {
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: '+ Create Department' }));
    expect(screen.getByText('department-table:create-open')).toBeInTheDocument();

    selectTreeNode('Engineering');
    expect(screen.getByRole('button', { name: '+ Create Team' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Evaluation Formula' }));
    expect(screen.queryByRole('button', { name: /\+ (Create|Add)/ })).not.toBeInTheDocument();
  });

  it('keeps the tree root label on one line', () => {
    renderTab();

    const rootLabel = screen.getByTitle('Organization Overview');
    expect(rootLabel).toHaveStyle({ whiteSpace: 'nowrap', textOverflow: 'ellipsis' });
  });
});
