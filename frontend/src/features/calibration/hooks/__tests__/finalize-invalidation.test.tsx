/** @vitest-environment jsdom */
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFinalizeSessionMutation, calibrationKeys } from '../use-calibration';
import { calibrationApi } from '../../api/calibration-api';
import { reviewDueKeys } from '../../../evaluation-cycles/api/review-due-keys';
import { organizationKeys } from '../../../organization/api/organization-keys';

vi.mock('../../api/calibration-api', () => ({
  calibrationApi: {
    finalizeSession: vi.fn(),
  },
}));

describe('useFinalizeSessionMutation', () => {
  it('refreshes review-due and employee schedule views because finalize auto-publishes', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    vi.mocked(calibrationApi.finalizeSession).mockResolvedValue(
      {} as Awaited<ReturnType<typeof calibrationApi.finalizeSession>>
    );

    const { result } = renderHook(() => useFinalizeSessionMutation('session-1'), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([calibrationKeys.all, reviewDueKeys.all, organizationKeys.employees.all])
    );
  });
});
