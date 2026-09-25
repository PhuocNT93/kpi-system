/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeFormModal } from '../EmployeeFormModal';
import { EmployeeReviewSchedulePanel } from '../EmployeeReviewSchedulePanel';
import { employeeApi } from '../../api/employee-api';
import { organizationApi } from '../../api/organization-api';
import { reviewCadenceApi } from '../../api/review-cadence-api';
import { useAuth } from '@/shared/auth/auth-context';
import { ApiClientError } from '@/shared/api/api-client';
import type { OrgEmployee, OrgReviewCadence } from '../../domain/organization-models';
import type { AuthContextValue } from '@/shared/auth/auth-context';
import type { UserRole } from '@/shared/auth/auth-models';

vi.mock('../../api/employee-api', () => ({
  employeeApi: {
    getEmployees: vi.fn(),
    getEmployee: vi.fn(),
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    bulkUpdateStatus: vi.fn(),
    getEmployeeCadence: vi.fn(),
    updateEmployeeCadenceOverride: vi.fn(),
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

vi.mock('../../api/review-cadence-api', () => ({
  reviewCadenceApi: {
    getCadences: vi.fn(),
  },
}));

vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

const NOW = new Date('2026-01-01T00:00:00.000Z');

const baseEmployee: OrgEmployee = {
  id: 'emp-1',
  employeeCode: 'EMP001',
  fullName: 'Nguyen Van A',
  email: 'a@example.com',
  departmentId: 'dept-1',
  teamId: '',
  roleId: 'role-1',
  jobLevelId: 'lvl-1',
  managerId: null,
  employmentStatus: 'ACTIVE',
  joinDate: '2024-01-01',
  terminationDate: null,
  reviewCadenceOverrideId: 'cad-12',
  lastEvaluationCompletedAt: '2026-01-15T10:00:00.000Z',
  nextReviewDueDate: '2027-01-15',
  effectiveCadence: {
    id: 'cad-12',
    code: 'ANNUAL',
    name: 'Annual',
    intervalMonths: 12,
    source: 'EMPLOYEE_OVERRIDE',
  },
  version: 3,
  createdAt: NOW,
  updatedAt: NOW,
};

const cadences: OrgReviewCadence[] = [
  { id: 'cad-6', code: 'SEMI', name: 'Semi-annual', intervalMonths: 6, isSystemDefault: false, isActive: true, createdAt: NOW, updatedAt: NOW },
  { id: 'cad-12', code: 'ANNUAL', name: 'Annual', intervalMonths: 12, isSystemDefault: true, isActive: true, createdAt: NOW, updatedAt: NOW },
];

let serverEmployee: OrgEmployee = baseEmployee;

function mockRole(role: UserRole) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u-1', email: 'u@example.com', name: 'User', role },
    isAuthenticated: true,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  } as unknown as AuthContextValue);
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderWithClient(ui: ReactNode, queryClient: QueryClient) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Employee review schedule (frontend)', () => {
  let queryClient: QueryClient;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    serverEmployee = baseEmployee;
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockRole('HR_ADMIN');

    vi.mocked(employeeApi.getEmployee).mockImplementation(() => Promise.resolve(serverEmployee));
    vi.mocked(employeeApi.updateEmployee).mockImplementation(() => Promise.resolve(serverEmployee));
    vi.mocked(organizationApi.getDepartments).mockResolvedValue([
      { id: 'dept-1', code: 'D1', name: 'Engineering', isActive: true, createdAt: NOW, updatedAt: NOW },
    ]);
    vi.mocked(organizationApi.getTeams).mockResolvedValue([]);
    vi.mocked(organizationApi.getJobRoles).mockResolvedValue([
      { id: 'role-1', code: 'DEV', name: 'Developer', description: null, isActive: true, createdAt: NOW, updatedAt: NOW },
    ]);
    vi.mocked(organizationApi.getJobLevels).mockResolvedValue([
      { id: 'lvl-1', code: 'L1', name: 'Junior', rank: 1, isActive: true, defaultReviewCadenceId: 'cad-6', createdAt: NOW, updatedAt: NOW },
      { id: 'lvl-2', code: 'L2', name: 'Senior', rank: 2, isActive: true, defaultReviewCadenceId: 'cad-12', createdAt: NOW, updatedAt: NOW },
    ]);
    vi.mocked(reviewCadenceApi.getCadences).mockResolvedValue(cadences);
  });

  async function renderEditModal(onClose = vi.fn()) {
    renderWithClient(<EmployeeFormModal isOpen employee={baseEmployee} onClose={onClose} />, queryClient);
    // Wait until the option lists have loaded so selects hold their real values.
    await screen.findByRole('option', { name: 'Senior' });
    await screen.findByRole('option', { name: /Semi-annual/ });
    return { onClose };
  }

  it('TC61 renders the backend-provided effective cadence and exact next due date', async () => {
    await renderEditModal();

    const panel = screen.getByTestId('employee-review-schedule-panel');
    expect(within(panel).getByTestId('effective-cadence-value')).toHaveTextContent('Annual (12 months)');
    expect(within(panel).getByTestId('cadence-source-value')).toHaveTextContent('Employee override');
    expect(within(panel).getByTestId('next-review-due-date-value')).toHaveTextContent(/^2027-01-15$/);
    expect(within(panel).getByTestId('last-evaluation-completed-value')).toHaveTextContent('2026-01-15');
  });

  it('TC62 changing the override calls updateEmployeeCadenceOverride once with the selected id', async () => {
    vi.mocked(employeeApi.updateEmployeeCadenceOverride).mockResolvedValue({
      employee_id: 'emp-1',
      review_cadence_override_id: 'cad-6',
      last_evaluation_completed_at: '2026-01-15T10:00:00.000Z',
      next_review_due_date: '2026-07-15',
      effective_cadence: { id: 'cad-6', code: 'SEMI', name: 'Semi-annual', interval_months: 6, source: 'EMPLOYEE_OVERRIDE' },
    });
    await renderEditModal();

    fireEvent.change(screen.getByLabelText('Review Cadence Override'), { target: { value: 'cad-6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(employeeApi.updateEmployeeCadenceOverride).toHaveBeenCalledTimes(1));
    expect(employeeApi.updateEmployeeCadenceOverride).toHaveBeenCalledWith(
      'emp-1',
      expect.objectContaining({ review_cadence_override_id: 'cad-6' }),
    );
  });

  it('TC63 successful override invalidates employee, cadence and review-due keys and shows the refetched due date', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(employeeApi.updateEmployeeCadenceOverride).mockImplementation(async () => {
      serverEmployee = {
        ...baseEmployee,
        reviewCadenceOverrideId: 'cad-6',
        nextReviewDueDate: '2026-07-15',
        effectiveCadence: { id: 'cad-6', code: 'SEMI', name: 'Semi-annual', intervalMonths: 6, source: 'EMPLOYEE_OVERRIDE' },
      };
      return {
        employee_id: 'emp-1',
        review_cadence_override_id: 'cad-6',
        last_evaluation_completed_at: '2026-01-15T10:00:00.000Z',
        next_review_due_date: '2026-07-15',
        effective_cadence: { id: 'cad-6', code: 'SEMI', name: 'Semi-annual', interval_months: 6, source: 'EMPLOYEE_OVERRIDE' },
      };
    });
    const { onClose } = await renderEditModal();

    fireEvent.change(screen.getByLabelText('Review Cadence Override'), { target: { value: 'cad-6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organization', 'employees'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organization', 'employees', 'emp-1', 'cadence'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reviews', 'due'] });

    // onClose is a spy here, so the modal stays mounted and we can observe the refetched server value.
    await waitFor(() =>
      expect(screen.getByTestId('next-review-due-date-value')).toHaveTextContent(/^2026-07-15$/),
    );
    expect(screen.getByTestId('effective-cadence-value')).toHaveTextContent('Semi-annual (6 months)');
  });

  it('TC64 job level change invalidates the affected keys and shows the new due date from the API without reload', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(employeeApi.updateEmployee).mockImplementation(async (_id, body) => {
      serverEmployee = {
        ...baseEmployee,
        jobLevelId: body.job_level_id ?? baseEmployee.jobLevelId,
        reviewCadenceOverrideId: null,
        nextReviewDueDate: '2027-03-01',
        effectiveCadence: { id: 'cad-12', code: 'ANNUAL', name: 'Annual', intervalMonths: 12, source: 'JOB_LEVEL_DEFAULT' },
      };
      return serverEmployee;
    });
    await renderEditModal();

    fireEvent.change(screen.getByLabelText('Job Level'), { target: { value: 'lvl-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(employeeApi.updateEmployee).toHaveBeenCalledTimes(1));
    expect(vi.mocked(employeeApi.updateEmployee).mock.calls[0][1]).toEqual(
      expect.objectContaining({ job_level_id: 'lvl-2' }),
    );
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reviews', 'due'] }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organization', 'employees'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organization', 'employees', 'emp-1', 'cadence'] });

    await waitFor(() =>
      expect(screen.getByTestId('next-review-due-date-value')).toHaveTextContent(/^2027-03-01$/),
    );
    expect(screen.getByTestId('cadence-source-value')).toHaveTextContent('Job level default');
  });

  it('TC65 does not compute dates on the client: no schedule inputs, no schedule fields sent, date unchanged until the server responds', async () => {
    const pendingUpdate = deferred<OrgEmployee>();
    vi.mocked(employeeApi.updateEmployee).mockReturnValue(pendingUpdate.promise);
    await renderEditModal();

    expect(screen.queryByLabelText(/Last Review Date/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Next Review Date/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('YYYY-MM')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Job Level'), { target: { value: 'lvl-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(employeeApi.updateEmployee).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(employeeApi.updateEmployee).mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('next_review_due_date');
    expect(payload).not.toHaveProperty('last_evaluation_completed_at');
    expect(payload).not.toHaveProperty('review_cadence');
    expect(payload).not.toHaveProperty('review_cadence_months');

    // While the PATCH is in flight the UI still shows the last server value.
    expect(screen.getByTestId('next-review-due-date-value')).toHaveTextContent(/^2027-01-15$/);

    serverEmployee = { ...baseEmployee, jobLevelId: 'lvl-2', nextReviewDueDate: '2027-02-01' };
    pendingUpdate.resolve(serverEmployee);

    await waitFor(() =>
      expect(screen.getByTestId('next-review-due-date-value')).toHaveTextContent(/^2027-02-01$/),
    );
  });

  it('TC66 a pending mutation disables submit and prevents duplicate requests', async () => {
    const pendingUpdate = deferred<OrgEmployee>();
    vi.mocked(employeeApi.updateEmployee).mockReturnValue(pendingUpdate.promise);
    await renderEditModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    const savingButton = await screen.findByRole('button', { name: 'Saving…' });
    expect(savingButton).toBeDisabled();
    expect(screen.getByLabelText('Review Cadence Override')).toBeDisabled();

    fireEvent.click(savingButton);
    fireEvent.submit(savingButton.closest('form') as HTMLFormElement);

    expect(employeeApi.updateEmployee).toHaveBeenCalledTimes(1);
    pendingUpdate.resolve(baseEmployee);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled());
    expect(employeeApi.updateEmployee).toHaveBeenCalledTimes(1);
  });

  it('TC67 409 VERSION_MISMATCH shows message, code and reload hint while keeping values and the modal open', async () => {
    vi.mocked(employeeApi.updateEmployee).mockRejectedValue(
      new ApiClientError('Employee was modified by another user.', 'VERSION_MISMATCH', 'req-409', 409),
    );
    const { onClose } = await renderEditModal();

    const nameInput = screen.getByLabelText(/Full Name/);
    fireEvent.change(nameInput, { target: { value: 'Edited Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Employee was modified by another user.')).toBeInTheDocument();
    expect(screen.getByTestId('employee-form-error-code')).toHaveTextContent('VERSION_MISMATCH');
    expect(screen.getByText(/Reload the latest data and try again/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload latest data' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toHaveValue('Edited Name');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('TC68 422 shows the server business-rule message', async () => {
    vi.mocked(employeeApi.updateEmployee).mockRejectedValue(
      new ApiClientError('Job level has no review cadence configured.', 'BUSINESS_RULE_VIOLATION', 'req-422', 422),
    );
    const { onClose } = await renderEditModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Job level has no review cadence configured.')).toBeInTheDocument();
    expect(screen.getByTestId('employee-form-error-code')).toHaveTextContent('BUSINESS_RULE_VIOLATION');
    expect(screen.queryByText(/Reload the latest data/)).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each<UserRole>(['MANAGER', 'EMPLOYEE'])('TC69 %s sees a read-only panel without the override select', async (role) => {
    mockRole(role);
    renderWithClient(
      <EmployeeReviewSchedulePanel employee={baseEmployee} overrideValue="cad-12" onOverrideChange={vi.fn()} />,
      queryClient,
    );

    expect(await screen.findByTestId('next-review-due-date-value')).toHaveTextContent(/^2027-01-15$/);
    expect(screen.getByTestId('effective-cadence-value')).toHaveTextContent('Annual (12 months)');
    expect(screen.queryByLabelText('Review Cadence Override')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('TC61b shows the due-now hint and dashes when the server has no schedule yet', async () => {
    serverEmployee = { ...baseEmployee, lastEvaluationCompletedAt: null, nextReviewDueDate: null, effectiveCadence: null };
    renderWithClient(<EmployeeReviewSchedulePanel employee={serverEmployee} />, queryClient);

    expect(await screen.findByText(/No completed evaluation yet/)).toBeInTheDocument();
    expect(screen.getByTestId('next-review-due-date-value')).toHaveTextContent('—');
    expect(screen.getByTestId('effective-cadence-value')).toHaveTextContent('—');
  });
});
