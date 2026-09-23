import { useCallback } from 'react';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { ORGANIZATION_FALLBACK_TRANSLATIONS } from '../i18n/organization-translations';

export function useOrganizationTranslation() {
  const { t: baseT, currentLocale, isEn } = useUiTranslation();

  const t = useCallback(
    (key: string, fallback?: string): string => {
      // 1. Try standard UI translations from server / localStorage
      const serverVal = baseT(key, '__NOT_FOUND__');
      if (serverVal !== '__NOT_FOUND__' && serverVal !== key) {
        return serverVal;
      }

      // 2. Check local fallback dictionary for current locale ('vi' or 'en')
      const targetLocale = (currentLocale === 'vi' ? 'vi' : 'en') as 'en' | 'vi';
      const dict = ORGANIZATION_FALLBACK_TRANSLATIONS[targetLocale] as Record<string, string>;
      if (dict && dict[key] !== undefined) {
        return dict[key];
      }

      // Try snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (dict && dict[snakeKey] !== undefined) {
        return dict[snakeKey];
      }

      // 3. Fallback to English dictionary if not English
      if (targetLocale !== 'en') {
        const enDict = ORGANIZATION_FALLBACK_TRANSLATIONS.en as Record<string, string>;
        if (enDict[key] !== undefined) return enDict[key];
        if (enDict[snakeKey] !== undefined) return enDict[snakeKey];
      }

      // 4. Return provided fallback or key
      return fallback ?? key;
    },
    [baseT, currentLocale]
  );

  return { t, currentLocale, isEn };
}
