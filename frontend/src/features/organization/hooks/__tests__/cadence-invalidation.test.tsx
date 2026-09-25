/** @vitest-environment jsdom */
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateJobLevel } from '../useJobLevels';
import { useUpdateReviewCadence, useDeleteReviewCadence } from '../useReviewCadences';
import { organizationApi } from '../../api/organization-api';
import { reviewCadenceApi } from '../../api/review-cadence-api';
import type { OrgJobLevel, OrgReviewCadence } from '../../domain/organization-models';

vi.mock('../../api/organization-api', () => ({
  organizationApi: {
    updateJobLevel: vi.fn(),
  },
}));

vi.mock('../../api/review-cadence-api', () => ({
  reviewCadenceApi: {
    updateCadence: vi.fn(),
    deleteCadence: vi.fn(),
  },
}));

const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('cadence-affecting mutation invalidation', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  });

  it('TC70 useUpdateJobLevel invalidates job levels, employees and review-due on success', async () => {
    const level: OrgJobLevel = {
      id: 'lvl-1', code: 'L1', name: 'Junior', rank: 1, isActive: true, defaultReviewCadenceId: 'cad-6', createdAt: NOW, updatedAt: NOW,
    };
    vi.mocked(organizationApi.updateJobLevel).mockResolvedValue(level);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateJobLevel(), { wrapper });
    result.current.mutate({ id: 'lvl-1', data: { default_review_cadence_id: 'cad-6' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(organizationApi.updateJobLevel).toHaveBeenCalledWith('lvl-1', { default_review_cadence_id: 'cad-6' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organization', 'jobLevels'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organization', 'employees'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reviews', 'due'] });
  });

  it('TC70b useUpdateJobLevel does not invalidate on failure', async () => {
    vi.mocked(organizationApi.updateJobLevel).mockRejectedValue(new Error('boom'));
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateJobLevel(), { wrapper });
    result.current.mutate({ id: 'lvl-1', data: { default_review_cadence_id: 'cad-6' } });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('TC71 useUpdateReviewCadence invalidates cadences, employees and review-due on success', async () => {
    const cadence: OrgReviewCadence = {
      id: 'cad-6', code: 'SEMI', name: 'Semi-annual', intervalMonths: 4, isSystemDefault: false, isActive: true, createdAt: NOW, updatedAt: NOW,
    };
    vi.mocked(reviewCadenceApi.updateCadence).mockResolvedValue(cadence);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateReviewCadence(), { wrapper });
    result.current.mutate({ id: 'cad-6', data: { interval_months: 4 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organization', 'reviewCadences'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organization', 'employees'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reviews', 'due'] });
  });

  it('TC71 useDeleteReviewCadence invalidates cadences, employees and review-due on success', async () => {
    vi.mocked(reviewCadenceApi.deleteCadence).mockResolvedValue(undefined);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteReviewCadence(), { wrapper });
    result.current.mutate('cad-6');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organization', 'reviewCadences'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organization', 'employees'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reviews', 'due'] });
  });
});
