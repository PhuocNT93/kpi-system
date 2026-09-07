/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/app/query-client';
import { AuthProvider } from '@/shared/auth/AuthProvider';

// Mock hooks
vi.mock('../api/use-i18n', () => ({
  useLocales: () => ({ data: ['en', 'vi'], isLoading: false }),
  useMasterEntities: () => ({
    data: [{ id: 'dept-1', code: 'DEPT-ENG', name: 'Software Engineering' }],
    isLoading: false,
  }),
  useAllMasterEntities: () => ({
    data: [{ id: 'dept-1', code: 'DEPT-ENG', name: 'Software Engineering', entityType: 'DEPARTMENT', entityLabel: 'Department (Phòng ban)' }],
    isLoading: false,
  }),
  useUpdateUserLocale: () => ({ mutateAsync: async () => {} }),
  useEntityTranslations: () => ({ data: null, refetch: async () => {} }),
  useUpsertEntityTranslations: () => ({ mutateAsync: async () => {} }),
}));

import { I18nPage } from '../pages/I18nPage';

describe('I18nPage', () => {
  it('renders and shows locales and sections', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <I18nPage />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('System Supported Locales')).toBeDefined();
    expect(screen.getByText('User Preferred Language')).toBeDefined();
    expect(screen.getByText('Master Data Translation Editor')).toBeDefined();
    expect(screen.getByText('EN (Baseline)')).toBeDefined();
  });
});
