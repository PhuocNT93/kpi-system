import { useState, useEffect, useMemo, useCallback } from 'react';
import { getApi, getAccessToken } from '../api/api-client';

export type UiLocale = 'en' | 'vi' | string;
export type UiTranslationsMap = Record<string, Record<string, string>>;

export const UI_TRANSLATIONS_STORAGE_KEY = 'kpi_ui_translations';
export const LOCALE_STORAGE_KEY = 'kpi_locale';
export const UI_TRANSLATIONS_EVENT = 'kpi_ui_translations_updated';
export const LOCALE_CHANGE_EVENT = 'kpi_locale_changed';

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function getUiLocale(): UiLocale {
  try {
    const loc =
      localStorage.getItem(LOCALE_STORAGE_KEY) ||
      localStorage.getItem('preferred_locale') ||
      'en';
    return loc === 'vi' ? 'vi' : 'en';
  } catch {
    return 'en';
  }
}

export function getUiTranslationsFromStorage(): UiTranslationsMap {
  try {
    const raw = localStorage.getItem(UI_TRANSLATIONS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function fetchAndStoreUiTranslations(entityType?: string): Promise<UiTranslationsMap> {
  // Never call backend if user is not authenticated
  const token = getAccessToken();
  if (!token) {
    return getUiTranslationsFromStorage();
  }

  try {
    const url = entityType
      ? `/api/i18n/ui-translations?entity_type=${encodeURIComponent(entityType)}`
      : '/api/i18n/ui-translations';
    const res = await getApi<{ translations: UiTranslationsMap }>(url);
    if (res && res.translations) {
      const current = getUiTranslationsFromStorage();
      const merged: UiTranslationsMap = { ...current };
      for (const [loc, dict] of Object.entries(res.translations)) {
        merged[loc] = { ...(merged[loc] || {}), ...dict };
      }
      localStorage.setItem(UI_TRANSLATIONS_STORAGE_KEY, JSON.stringify(merged));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(UI_TRANSLATIONS_EVENT, { detail: merged }));
      }
      return merged;
    }
  } catch {
    // Network or server waking up, fallback to storage
  }
  return getUiTranslationsFromStorage();
}

export function useUiTranslation(explicitLocale?: UiLocale) {
  const [translations, setTranslations] = useState<UiTranslationsMap>(() =>
    getUiTranslationsFromStorage()
  );

  const [activeLocale, setActiveLocale] = useState<UiLocale>(() => {
    if (explicitLocale) return explicitLocale;
    return getUiLocale();
  });

  const currentLocale: UiLocale = useMemo(() => {
    if (explicitLocale) return explicitLocale;
    return activeLocale;
  }, [explicitLocale, activeLocale]);

  useEffect(() => {
    const handleUpdate = () => {
      setTranslations(getUiTranslationsFromStorage());
      if (!explicitLocale) {
        setActiveLocale(getUiLocale());
      }
    };

    const handleLocaleChange = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      const newLoc = customEvt.detail || getUiLocale();
      if (!explicitLocale) {
        setActiveLocale(newLoc === 'vi' ? 'vi' : 'en');
      }
    };

    window.addEventListener(UI_TRANSLATIONS_EVENT, handleUpdate);
    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange as EventListener);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(UI_TRANSLATIONS_EVENT, handleUpdate);
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange as EventListener);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [explicitLocale]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const activeDict = translations[currentLocale] || {};
      const enDict = translations['en'] || {};

      const lookup = (dict: Record<string, string>): string | undefined => {
        if (!dict) return undefined;
        if (dict[key] !== undefined) return dict[key];
        const snake = toSnakeCase(key);
        if (dict[snake] !== undefined) return dict[snake];
        const camel = toCamelCase(key);
        if (dict[camel] !== undefined) return dict[camel];
        return undefined;
      };

      const found = lookup(activeDict);
      if (found !== undefined) return found;

      if (currentLocale !== 'en') {
        const enFound = lookup(enDict);
        if (enFound !== undefined) return enFound;
      }

      return fallback ?? key;
    },
    [translations, currentLocale]
  );

  return {
    t,
    currentLocale,
    isEn: currentLocale === 'en',
    reloadTranslations: fetchAndStoreUiTranslations,
  };
}

// Alias for convenience across audit views
export const useAuditI18n = useUiTranslation;
export const getAuditLocale = getUiLocale;
