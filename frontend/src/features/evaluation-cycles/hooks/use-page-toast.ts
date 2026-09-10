import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageToastMessage, PageToastType } from '../components/PageToast';

export function usePageToast(autoHideMs = 4000) {
  const [toast, setToast] = useState<PageToastMessage | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearToast = useCallback(() => {
    setToast(null);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showToast = useCallback((type: PageToastType, message: string) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setToast({ type, message });
    timeoutRef.current = window.setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, autoHideMs);
  }, [autoHideMs]);

  useEffect(() => clearToast, [clearToast]);

  return { toast, showToast, clearToast };
}
