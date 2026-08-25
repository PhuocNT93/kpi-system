import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { mswServer } from '../../../../test-setup';
import { ProtectedRoute } from '../../../../shared/auth/ProtectedRoute';
import { AuthProvider } from '../../../../shared/auth/AuthContext';
import { RoleTable } from '../../components/RoleTable';

const BASE = 'http://localhost:8080';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('RoleTable', () => {
  it('renders roles after loading', async () => {
    renderWithProviders(<RoleTable />);
    await waitFor(() => {
      expect(screen.getByText('SYSTEM_ADMIN')).toBeInTheDocument();
    });
    expect(screen.getByText('System Admin')).toBeInTheDocument();
    expect(screen.getByText('HR Admin')).toBeInTheDocument();
  });

  it('shows empty state when no roles', async () => {
    mswServer.use(
      http.get(`${BASE}/api/iam/roles`, () =>
        HttpResponse.json({ success: true, message: 'OK', data: [], meta: { request_id: 'x', timestamp: '' } }),
      ),
    );
    renderWithProviders(<RoleTable />);
    await waitFor(() => {
      expect(screen.getByText(/no roles found/i)).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    mswServer.use(
      http.get(`${BASE}/api/iam/roles`, () =>
        HttpResponse.json(
          { success: false, message: 'Server error', data: null, meta: { request_id: 'x', timestamp: '', error: { code: 'INTERNAL_ERROR', field: null, details: [] } } },
          { status: 500 },
        ),
      ),
    );
    renderWithProviders(<RoleTable />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('ProtectedRoute — 403 behavior', () => {
  it('does not render protected content when unauthenticated', () => {
    renderWithProviders(
      <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
        <div>Secret Content</div>
      </ProtectedRoute>,
    );
    // Unauthenticated → redirected to /login, secret content not rendered
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });
});
