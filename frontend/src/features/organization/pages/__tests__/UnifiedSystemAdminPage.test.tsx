/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { UnifiedSystemAdminPage } from '../UnifiedSystemAdminPage';
import * as authContextModule from '@/shared/auth/auth-context';

vi.mock('@/shared/auth/auth-context', () => ({ useAuth: vi.fn() }));

const { stub } = vi.hoisted(() => ({
  stub: (name: string) => () => <div data-testid="tab-content">{name}</div>,
}));
vi.mock('../OrganizationPage', () => ({ OrganizationPage: stub('organization') }));
vi.mock('@/features/audit/pages/AuditLogPage', () => ({ AuditLogPage: stub('audit') }));
vi.mock('@/features/i18n/pages/I18nPage', () => ({ I18nPage: stub('i18n') }));
vi.mock('@/features/iam/components/UserTable', () => ({ UserTable: stub('iam-users') }));
vi.mock('@/features/iam/components/RoleTable', () => ({ RoleTable: stub('iam-roles') }));
vi.mock('@/features/iam/components/PermissionTable', () => ({ PermissionTable: stub('iam-permissions') }));

const LocationProbe = () => <div data-testid="location">{useLocation().search}</div>;

const renderHub = (role: string, search = '') => {
  vi.mocked(authContextModule.useAuth).mockReturnValue({
    user: { id: 'u1', email: 'u@kpi.com', role },
    isAuthenticated: true,
  } as unknown as ReturnType<typeof authContextModule.useAuth>);

  render(
    <MemoryRouter initialEntries={[`/admin/system-admin${search}`]}>
      <Routes>
        <Route
          path="/admin/system-admin"
          element={
            <>
              <UnifiedSystemAdminPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

// The hub-level tab bar is the first tablist; the IAM sub-tab bar is a second one.
const hubTabs = () => screen.getAllByRole('tablist')[0].querySelectorAll('[role="tab"]');

describe('UnifiedSystemAdminPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it.each(['SYSTEM_ADMIN', 'HR_ADMIN'])('shows the four hub tabs for %s', (role) => {
    renderHub(role);
    expect(hubTabs()).toHaveLength(4);
  });

  it('switches tabs through the tab query parameter', () => {
    renderHub('SYSTEM_ADMIN', '?tab=organization');
    expect(screen.getByTestId('tab-content')).toHaveTextContent('organization');

    fireEvent.click(hubTabs()[1]);

    expect(screen.getByTestId('location')).toHaveTextContent('?tab=iam');
    expect(screen.getByTestId('tab-content')).toHaveTextContent('iam-users');
  });

  it('falls back to the first tab for an unknown tab id', () => {
    renderHub('SYSTEM_ADMIN', '?tab=xyz');
    expect(screen.getByTestId('tab-content')).toHaveTextContent('organization');
    expect(hubTabs()[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('shows a readable role name instead of the role code', () => {
    renderHub('SYSTEM_ADMIN');
    expect(screen.getByText(/System Admin/)).toBeInTheDocument();
    expect(screen.queryByText(/SYSTEM_ADMIN/)).not.toBeInTheDocument();
  });

  it('switches IAM sub-tabs with the shared sub-tab bar', () => {
    renderHub('HR_ADMIN', '?tab=iam');
    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Roles' }));
    expect(screen.getByTestId('tab-content')).toHaveTextContent('iam-roles');
    expect(screen.getByRole('tab', { name: 'Roles' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }));
    expect(screen.getByTestId('tab-content')).toHaveTextContent('iam-permissions');
  });

  it('renders the tab content in a panel that fills the height without scrolling itself', () => {
    renderHub('SYSTEM_ADMIN', '?tab=audit');
    const panel = screen.getByRole('tabpanel');
    expect(panel).toContainElement(screen.getByTestId('tab-content'));
    expect(panel).toHaveClass('fill-column');
    expect(panel.style.overflowY).toBe('');
  });
});
