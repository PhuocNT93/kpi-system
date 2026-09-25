import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateAfterEvaluationPublish } from '../evaluation-publish-invalidation';

describe('invalidateAfterEvaluationPublish', () => {
  it('TC75 publish success invalidates evaluation detail, review-due and employees', () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateAfterEvaluationPublish(queryClient, 'eval-1');

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['evaluation-detail', 'eval-1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reviews', 'due'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['organization', 'employees'] });
  });
});
