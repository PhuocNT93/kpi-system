/** Business timezone used by the backend to derive review dates (backend BUSINESS_TIMEZONE). */
export const BUSINESS_TIME_ZONE: string = import.meta.env.VITE_BUSINESS_TIMEZONE ?? 'Asia/Ho_Chi_Minh';

/**
 * Display-only formatting of an ISO timestamp returned by the backend as a calendar date (YYYY-MM-DD) in the
 * business timezone — the same calendar day the backend uses as the base of next_review_due_date.
 * `slice(0, 10)` would show the UTC date, which differs near midnight. Never used to compute a due date.
 */
export function formatTimestampAsLocalDate(value: string | null | undefined, emptyValue = '—'): string {
  if (!value) return emptyValue;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return emptyValue;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}
