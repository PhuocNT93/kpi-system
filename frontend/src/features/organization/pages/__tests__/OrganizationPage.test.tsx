/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OrganizationPage } from '../OrganizationPage';

vi.mock('../../components/OrgStructureTab', () => ({ OrgStructureTab: () => <div>org-structure-content</div> }));
vi.mock('../../components/JobArchitectureTab', () => ({ JobArchitectureTab: () => <div>job-architecture-content</div> }));

describe('OrganizationPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('does not render its own page title inside the hub', () => {
    // A colliding page_title from another screen must not surface here.
    localStorage.setItem('kpi_ui_translations', JSON.stringify({ en: { page_title: 'Review Due Dashboard' } }));

    render(<OrganizationPage />);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText('Review Due Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Organization Management')).not.toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByText('org-structure-content')).toBeInTheDocument();
  });

  it('switches to Job Architecture', () => {
    render(<OrganizationPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Job Architecture' }));

    expect(screen.getByRole('tab', { name: 'Job Architecture' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('job-architecture-content')).toBeInTheDocument();
  });
});
