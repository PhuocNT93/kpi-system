// TanStack Query key factory for the Review Due dashboard.
// The `all` prefix is shared by every list key so a single invalidation refreshes all filtered views.

import type { ReviewDueFilters } from '../domain/review-due-models';

export const reviewDueKeys = {
  all: ['reviews', 'due'] as const,
  list: (filters?: ReviewDueFilters) => ['reviews', 'due', 'list', filters ?? {}] as const,
};
