/**
 * Financial cycle logic for album payments.
 *
 * Business rules (canonical):
 *   - Albums produced between day 03 (inclusive) and day 18 (exclusive) of month M:
 *       cycle = [M-03, M-18) → payment on day 03 of month M+1
 *   - Albums produced between day 18 (inclusive) of month M and day 03 (exclusive) of month M+1:
 *       cycle = [M-18, (M+1)-03) → payment on day 18 of month M+1
 *
 * All computations operate on local date components (day/month/year) — we do NOT
 * convert to UTC, because the cycle is defined by calendar day boundaries.
 */

export interface PaymentCycle {
  /** First day of the cycle (inclusive) */
  cycleStart: Date;
  /** Last day of the cycle (exclusive — used as next-cycle seed) */
  cycleEnd: Date;
  /** Last day of the cycle (inclusive — used for display and countdowns) */
  lastDay: Date;
  /** Date the album will be paid on */
  paymentDate: Date;
  /** Human-readable cycle label, e.g. "03/mai → 18/mai" */
  label: string;
}

function makeLocalDate(year: number, month0: number, day: number): Date {
  // month0 is 0-based (Date constructor convention)
  return new Date(year, month0, day, 0, 0, 0, 0);
}

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

/**
 * Converts a real instant into a Date whose local getters (getDate/getMonth/
 * getFullYear/getHours/...) report the wall-clock date/time in
 * America/Sao_Paulo, regardless of the timezone the JS runtime itself is
 * configured with (server functions commonly run in UTC). Payment cycles are
 * defined by Brazilian calendar days, so any "now" fed into
 * computePaymentCycle must go through this first. Brazil has used a fixed
 * UTC-3 offset (no DST) since 2019, so the shift is constant and
 * order-preserving — safe for range comparisons too, as long as both sides
 * of the comparison go through the same conversion.
 */
export function toBrazilTime(d: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
    0,
  );
}

/** Current date/time as Brazilian wall-clock components (see toBrazilTime). */
export function nowBR(): Date {
  return toBrazilTime(new Date());
}

const MONTH_NAMES_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function shortLabel(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${MONTH_NAMES_PT[d.getMonth()]}`;
}

/**
 * Given any production date, compute which financial cycle it falls into
 * and when it will be paid.
 */
export function computePaymentCycle(input: Date | string): PaymentCycle {
  const d =
    typeof input === "string"
      ? new Date(input.includes("T") ? input : input + "T12:00:00")
      : new Date(input);
  // Normalize using local components
  const day = d.getDate();
  const month0 = d.getMonth();
  const year = d.getFullYear();

  let cycleStart: Date;
  let cycleEnd: Date;
  let paymentDate: Date;

  if (day >= 3 && day < 18) {
    // Cycle A: 3rd to 17th (payment on 3rd of next month)
    cycleStart = makeLocalDate(year, month0, 3);
    cycleEnd = makeLocalDate(year, month0, 18);
    paymentDate = makeLocalDate(year, month0 + 1, 3);
  } else if (day >= 18) {
    // Cycle B: 18th to next month's 2nd (payment on 18th of next month)
    cycleStart = makeLocalDate(year, month0, 18);
    cycleEnd = makeLocalDate(year, month0 + 1, 3);
    paymentDate = makeLocalDate(year, month0 + 1, 18);
  } else {
    // day < 3 - tail of previous month's Cycle B
    cycleStart = makeLocalDate(year, month0 - 1, 18);
    cycleEnd = makeLocalDate(year, month0, 3);
    paymentDate = makeLocalDate(year, month0, 18);
  }

  const lastDay = cycleEnd;
  const label = `${shortLabel(cycleStart)} → ${shortLabel(cycleEnd)}`;

  return { cycleStart, cycleEnd, lastDay, paymentDate, label };
}

/** Cycles turn over at this hour (Brasília time) on days 03 and 18, not at midnight. */
const CYCLE_CUTOFF_HOUR = 18;

/**
 * Resolves which payment cycle a real moment (e.g. "now", or the instant an
 * album was marked as sent) belongs to. An album sent at 10:00 on the 18th
 * still belongs to the cycle that's about to close; one sent at 19:00
 * already belongs to the new one. We model this by shifting the Brazilian
 * wall-clock instant back by the cutoff hour before reading off its calendar
 * day, then reusing the (hour-agnostic) day-based rule above. Only use this
 * for real instants — for calendar-day markers (e.g. chaining cycleEnd into
 * the next cycle, or building a label from a payment date) use
 * computePaymentCycle directly, since those don't carry a meaningful hour.
 */
export function computePaymentCycleForInstant(instant: Date): PaymentCycle {
  const brazilNow = toBrazilTime(instant);
  const shifted = new Date(brazilNow.getTime() - CYCLE_CUTOFF_HOUR * 60 * 60 * 1000);
  return computePaymentCycle(shifted);
}

/**
 * Returns an ISO date string (YYYY-MM-DD) without timezone shifting.
 * Used when persisting to Supabase `date` columns.
 */
export function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Format BRL currency.
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Format date as dd/MM/yyyy.
 */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d =
    typeof value === "string"
      ? new Date(value.includes("T") ? value : value + "T12:00:00")
      : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Returns the cycle key (paymentDate as YYYY-MM-DD) for grouping albums.
 */
export function cycleKey(d: Date | string): string {
  const { paymentDate } = computePaymentCycle(d);
  return toDateOnly(paymentDate);
}

/**
 * Build "current" and "next" cycle bounds based on a reference date (default: today).
 */
export function getCurrentAndNextCycle(reference: Date = nowBR()) {
  const current = computePaymentCycle(reference);
  // Next cycle starts where current ends
  const next = computePaymentCycle(current.cycleEnd);
  return { current, next };
}
