/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewDueDashboard } from '../ReviewDueDashboard';
import { getApi } from '@/shared/api/api-client';
import { organizationApi } from '@/features/organization/api/organization-api';
import { reviewCadenceApi } from '@/features/organization/api/review-cadence-api';
import { realReviewDueResponse } from '../../domain/__tests__/review-due-fixtures';

vi.mock('@/shared/api/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/api-client')>();
  return { ...actual, getApi: vi.fn() };
});

vi.mock('@/features/organization/api/organization-api', () => ({
  organizationApi: { getTeams: vi.fn() },
}));

vi.mock('@/features/organization/api/review-cadence-api', () => ({
  reviewCadenceApi: { getCadences: vi.fn() },
}));

vi.mock('@/features/templates/api/use-templates', () => ({
  useTemplatesQuery: () => ({ data: [], isPending: false }),
}));

describe('ReviewDueDashboard', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApi).mockImplementation(async (path: string) => {
      if (path.startsWith('/api/reviews/due')) return realReviewDueResponse;
      throw new Error(`Unexpected GET ${path}`);
    });
    vi.mocked(organizationApi.getTeams).mockResolvedValue([]);
    vi.mocked(reviewCadenceApi.getCadences).mockResolvedValue([]);
  });

  it('TC73 renders the real backend response without crashing, with raw date strings and JOB_LEVEL_DEFAULT source badge', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ReviewDueDashboard />
      </QueryClientProvider>,
    );

    const desktopTable = await screen.findByRole('table');
    const table = within(desktopTable);

    expect(table.getByText('Tran Thi B')).toBeInTheDocument();
    expect(table.getByText('Le Van C')).toBeInTheDocument();
    expect(table.getAllByText('Platform')).toHaveLength(2);
    expect(table.getByText('Senior')).toBeInTheDocument();
    // Date-only string rendered exactly; timestamp shown by its date part, no timezone shift.
    expect(table.getByText('2026-10-01')).toBeInTheDocument();
    expect(table.getByText('2026-03-31')).toBeInTheDocument();
    expect(table.getByText('Semi-annual (6 months)')).toBeInTheDocument();
    expect(table.getByText('By Job Level')).toBeInTheDocument();
    expect(table.getByText('Overdue (4 days)')).toBeInTheDocument();
    expect(table.getByText('No Schedule')).toBeInTheDocument();

    // Query uses the accepted params only.
    const requestedPath = vi.mocked(getApi).mock.calls.map(([path]) => path).find((path) => path.startsWith('/api/reviews/due'));
    expect(requestedPath).toContain('page=1');
    expect(requestedPath).toContain('page_size=50');
    expect(requestedPath).not.toContain('limit=');
    expect(requestedPath).not.toContain('lead_time_days');
  });
});
