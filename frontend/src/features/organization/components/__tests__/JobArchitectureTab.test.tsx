/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { JobArchitectureTab } from '../JobArchitectureTab';

vi.mock('../../../../shared/auth/auth-context', () => ({ useAuth: () => ({ user: { role: 'HR_ADMIN' } }) }));
vi.mock('../OrgRoleTable', () => ({
  OrgRoleTable: ({ createControl }: { createControl?: { isOpen: boolean } }) => (
    <div>role-table{createControl?.isOpen ? ':create-open' : ''}</div>
  ),
}));
vi.mock('../JobLevelTable', () => ({ JobLevelTable: () => <div>level-table</div> }));
vi.mock('../ReviewCadenceTable', () => ({ ReviewCadenceTable: () => <div>cadence-table</div> }));

describe('JobArchitectureTab', () => {
  afterEach(() => cleanup());

  it('TC44: shows one table at a time, starting with Job Roles', () => {
    render(<JobArchitectureTab />);

    expect(screen.getByRole('tab', { name: 'Job Roles' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('role-table')).toBeInTheDocument();
    expect(screen.queryByText('level-table')).not.toBeInTheDocument();
    expect(screen.queryByText('cadence-table')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Job Levels' }));
    expect(screen.getByText('level-table')).toBeInTheDocument();
    expect(screen.queryByText('role-table')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Review Cadences' }));
    expect(screen.getByText('cadence-table')).toBeInTheDocument();
    expect(screen.queryByText('level-table')).not.toBeInTheDocument();
  });

  it('shows the create button of the active table beside the sub-tabs', () => {
    render(<JobArchitectureTab />);

    fireEvent.click(screen.getByRole('button', { name: '+ Create Role' }));
    expect(screen.getByText('role-table:create-open')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Review Cadences' }));
    expect(screen.getByRole('button', { name: '+ Create Cadence' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Create Role' })).not.toBeInTheDocument();
  });
});
