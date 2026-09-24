import { useCallback, useEffect, useState } from 'react';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';

/** Same breakpoint as AppLayout. */
export const MOBILE_BREAKPOINT_PX = 768;

export type TranslationVars = Record<string, string | number>;

/**
 * UI strings of the Individual Evaluation page (INDIVIDUAL_CYCLE_UI, stored in localStorage by
 * `useUiTranslation`). `t(key, fallback, vars)` replaces `{name}` placeholders.
 */
export function useIndividualCycleTranslation() {
  const { t: baseT, currentLocale } = useUiTranslation();

  const t = useCallback(
    (key: string, fallback: string, vars?: TranslationVars): string => {
      const template = baseT(key, fallback);
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        vars[name] !== undefined ? String(vars[name]) : match
      );
    },
    [baseT]
  );

  return { t, currentLocale };
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT_PX : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
