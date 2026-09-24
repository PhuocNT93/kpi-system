export const DEFAULT_UPCOMING_BATCH_CYCLE_WINDOW_WEEKS = 4;
export const DEFAULT_BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** IANA timezone used to compute "today"; falls back to the default when BUSINESS_TIMEZONE is missing or invalid. */
export function getBusinessTimeZone(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.BUSINESS_TIMEZONE?.trim();
  if (!configured) {
    return DEFAULT_BUSINESS_TIMEZONE;
  }
  if (!isValidTimeZone(configured)) {
    console.warn(`Invalid BUSINESS_TIMEZONE "${configured}", falling back to ${DEFAULT_BUSINESS_TIMEZONE}.`);
    return DEFAULT_BUSINESS_TIMEZONE;
  }
  return configured;
}

/**
 * Number of weeks ahead in which a DRAFT batch cycle counts as "upcoming" when warning about
 * individual cycle creation (LLD §14.1, "N configurable"). Shares BATCH_CYCLE_LEAD_TIME_WEEKS with the
 * Review Due Dashboard. Falls back to the default when missing or not a positive integer.
 */
export function getUpcomingBatchCycleWindowWeeks(env: NodeJS.ProcessEnv = process.env): number {
  const configured = env.BATCH_CYCLE_LEAD_TIME_WEEKS?.trim();
  if (!configured) {
    return DEFAULT_UPCOMING_BATCH_CYCLE_WINDOW_WEEKS;
  }
  const weeks = Number(configured);
  if (!Number.isInteger(weeks) || weeks < 1) {
    console.warn(
      `Invalid BATCH_CYCLE_LEAD_TIME_WEEKS "${configured}", falling back to ${DEFAULT_UPCOMING_BATCH_CYCLE_WINDOW_WEEKS}.`
    );
    return DEFAULT_UPCOMING_BATCH_CYCLE_WINDOW_WEEKS;
  }
  return weeks;
}

export interface BusinessDateWindow {
  fromDate: string;
  toDate: string;
}

/** Today's calendar date (YYYY-MM-DD) in the business timezone. */
export function getBusinessToday(now: Date = new Date(), env: NodeJS.ProcessEnv = process.env): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: getBusinessTimeZone(env),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** [business today, business today + N weeks] used to detect upcoming batch cycles. */
export function getUpcomingBatchCycleWindow(now: Date = new Date(), env: NodeJS.ProcessEnv = process.env): BusinessDateWindow {
  const fromDate = getBusinessToday(now, env);
  return { fromDate, toDate: addDays(fromDate, getUpcomingBatchCycleWindowWeeks(env) * 7) };
}
