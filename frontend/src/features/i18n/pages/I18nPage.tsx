/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import EntityTranslationEditor from '../components/EntityTranslationEditor';
import { useLocales, useUpdateUserLocale } from '../api/use-i18n';
import { LoadingSpinner, ErrorAlert, StatusBadge } from '@/shared/components/ui';
import { Button } from '@/shared/ui/Button/Button';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';

export function I18nPage() {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const { data: localesData, isLoading, error, refetch } = useLocales();
  const locales: string[] = localesData ?? [];
  const updateLocale = useUpdateUserLocale();

  const [preferred, setPreferred] = React.useState('en');
  const [toast, setToast] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function saveLocale() {
    setToast(null);
    try {
      await updateLocale.mutateAsync(preferred);
      setToast({ type: 'success', message: t('i18n.toast.success', 'User preferred locale updated successfully!') });
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || t('i18n.toast.error', 'Failed to update user preferred locale.') });
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem', width: '100%', boxSizing: 'border-box' }}>
        {isLoading ? (
          <LoadingSpinner label={t('i18n.loading', 'Loading i18n configuration...')} />
        ) : error ? (
          <ErrorAlert error={error} onRetry={refetch} />
        ) : (
          <>
            {/* Top Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* System Locales Card */}
              <div
                style={{
                  background: isDark ? '#111827' : '#ffffff',
                  borderRadius: 8,
                  border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                  padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                    {t('i18n.system_locales_title', 'System Supported Locales')}
                  </h2>
                  <StatusBadge status="ACTIVE" />
                </div>
                <p style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                  {t('i18n.system_locales_desc', 'Active languages supported by the backend polymorphic i18n service (LLD v1.5 §21.1).')}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.25rem' }}>
                  {locales.map((loc) => (
                    <span
                      key={loc}
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: 16,
                        background: loc === 'en' ? (isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff') : (isDark ? '#1f2937' : '#f1f5f9'),
                        color: loc === 'en' ? (isDark ? '#c7d2fe' : '#3730a3') : (isDark ? '#e2e8f0' : '#334155'),
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        border: `1px solid ${loc === 'en' ? (isDark ? '#4338ca' : '#cbd5e1') : (isDark ? '#374151' : '#cbd5e1')}`,
                      }}
                    >
                      {loc.toUpperCase()} {loc === 'en' && `(${t('i18n.baseline', 'Baseline')})`}
                    </span>
                  ))}
                </div>
              </div>

              {/* User Preferred Locale Card */}
              <div
                style={{
                  background: isDark ? '#111827' : '#ffffff',
                  borderRadius: 8,
                  border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                  padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  {t('i18n.user_preferred_title', 'User Preferred Language')}
                </h2>
                <p style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                  {t('i18n.user_preferred_desc', 'Set your personal preferred locale for resolving master data names and UI strings.')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '0.25rem' }}>
                  <select
                    value={preferred}
                    onChange={(e) => setPreferred(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: 6,
                      border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
                      fontSize: '0.875rem',
                      outline: 'none',
                      background: isDark ? '#1f2937' : '#fff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      flex: 1,
                    }}
                  >
                    {locales.map((l) => (
                      <option key={l} value={l}>
                        {l.toUpperCase()} — {l === 'en' ? 'English' : l === 'vi' ? 'Tiếng Việt' : l === 'ja' ? 'Japanese' : l}
                      </option>
                    ))}
                  </select>
                  <Button onClick={saveLocale} disabled={updateLocale.isPending}>
                    {updateLocale.isPending ? t('common.saving', 'Saving...') : t('i18n.save_preference', 'Save Preference')}
                  </Button>
                </div>
                {toast && (
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      color: toast.type === 'success' ? (isDark ? '#34d399' : '#065f46') : (isDark ? '#f87171' : '#991b1b'),
                    }}
                  >
                    {toast.message}
                  </div>
                )}
              </div>
            </div>

            {/* Master Data Entity Translations Section */}
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  {t('i18n.editor_title', 'Master Data Translation Editor')}
                </h2>
                <p style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b', margin: '0.25rem 0 0' }}>
                  {t('i18n.editor_desc', 'View, edit, and upsert multi-language translations for generic master data entities (Polymorphic table i18n_translation).')}
                </p>
              </div>
              <EntityTranslationEditor />
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default I18nPage;
