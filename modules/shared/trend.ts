export const DAY_MS = 24 * 3_600_000;
export const WEEK_MS = 7 * DAY_MS;

/** Splits a timestamped list into "this window" vs "the window before that", for a genuine period-over-period comparison. */
export function splitByRecency<T>(items: T[], getDate: (item: T) => string, windowMs: number, now = Date.now()): { current: T[]; previous: T[] } {
  const current: T[] = [];
  const previous: T[] = [];
  for (const item of items) {
    const age = now - new Date(getDate(item)).getTime();
    if (age < windowMs) current.push(item);
    else if (age < windowMs * 2) previous.push(item);
  }
  return { current, previous };
}

export type TrendDirection = "up" | "down" | "flat";

export interface Trend {
  direction: TrendDirection;
  /** Whether this change is good or bad news -- independent of raw direction, since "cancellations up" and "revenue up" mean opposite things. */
  tone: "positive" | "warning" | "neutral";
  label: string;
}

/**
 * Period-over-period trend for a metric card. `goodDirection` says which
 * raw direction counts as good news for this specific metric (revenue:
 * "up" is good; cancellations: "down" is good) so the color reflects
 * whether the change is actually good or bad, not just which way the
 * number moved.
 */
export function computeTrend(current: number, previous: number, goodDirection: "up" | "down" = "up"): Trend {
  if (previous === 0 && current === 0) {
    return { direction: "flat", tone: "neutral", label: "No activity yet" };
  }
  if (previous === 0) {
    return { direction: "up", tone: goodDirection === "up" ? "positive" : "warning", label: "New this period" };
  }

  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) {
    return { direction: "flat", tone: "neutral", label: "Flat vs last period" };
  }

  const direction: TrendDirection = pct > 0 ? "up" : "down";
  const isGoodNews = direction === goodDirection;
  return {
    direction,
    tone: isGoodNews ? "positive" : "warning",
    label: `${pct > 0 ? "+" : ""}${pct}% vs last period`,
  };
}
