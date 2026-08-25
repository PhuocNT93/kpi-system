import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { mswServer } from '../../../../test-setup';
import { UserTable } from '../../components/UserTable';
import { AuthProvider } from '../../../../shared/auth/AuthContext';

const BASE = 'http://localhost:8080';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('UserTable', () => {
  it('shows loading state initially', () => {
    renderWithProviders(<UserTable />);
    expect(screen.getByRole('status', { name: /loading users/i })).toBeInTheDocument();
  });

  it('renders user list after data loads', async () => {
    renderWithProviders(<UserTable />);
    await waitFor(() => {
      expect(screen.getByText('System Admin')).toBeInTheDocument();
    });
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('HR User')).toBeInTheDocument();
  });

  it('shows empty state when no users returned', async () => {
    mswServer.use(
      http.get(`${BASE}/api/iam/users`, () =>
        HttpResponse.json({
          success: true, message: 'OK', data: [],
          meta: { request_id: 'x', timestamp: '' },
        }),
      ),
    );
    renderWithProviders(<UserTable />);
    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });
  });

  it('shows error state with retry button when API fails', async () => {
    mswServer.use(
      http.get(`${BASE}/api/iam/users`, () =>
        HttpResponse.json(
          {
            success: false, message: 'Internal Server Error', data: null,
            meta: { request_id: 'x', timestamp: '', error: { code: 'INTERNAL_ERROR', field: null, details: [] } },
          },
          { status: 500 },
        ),
      ),
    );
    renderWithProviders(<UserTable />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('opens create user dialog when button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserTable />);
    await waitFor(() => screen.getByText('System Admin'));
    await user.click(screen.getByRole('button', { name: /create user/i }));
    expect(screen.getByRole('dialog', { name: /create user/i })).toBeInTheDocument();
  });

  it('displays INACTIVE status badge for inactive users', async () => {
    renderWithProviders(<UserTable />);
    await waitFor(() => screen.getByText('HR User'));
    const badges = screen.getAllByLabelText(/status/i);
    expect(badges.some((b) => b.getAttribute('aria-label')?.includes('Inactive'))).toBe(true);
  });
});
