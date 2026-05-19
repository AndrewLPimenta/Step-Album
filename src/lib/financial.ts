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

  if (day >= 3 && day <= 18) {
    // Cycle A: 3rd to 18th inclusive
    cycleStart = makeLocalDate(year, month0, 3);
    cycleEnd = makeLocalDate(year, month0, 19); // exclusive; last inclusive = 18th
    paymentDate = makeLocalDate(year, month0 + 1, 3);
  } else if (day > 18) {
    // Cycle B: 19th to next month's 3rd inclusive
    cycleStart = makeLocalDate(year, month0, 19);
    cycleEnd = makeLocalDate(year, month0 + 1, 4); // exclusive; last inclusive = 3rd
    paymentDate = makeLocalDate(year, month0 + 1, 18);
  } else {
    // day < 3 - tail of previous month's Cycle B (19th to 3rd)
    cycleStart = makeLocalDate(year, month0 - 1, 19);
    cycleEnd = makeLocalDate(year, month0, 4); // exclusive; last inclusive = 3rd
    paymentDate = makeLocalDate(year, month0, 18);
  }

  const lastDay = makeLocalDate(cycleEnd.getFullYear(), cycleEnd.getMonth(), cycleEnd.getDate() - 1);
  const label = `${shortLabel(cycleStart)} → ${shortLabel(lastDay)}`;

  return { cycleStart, cycleEnd, lastDay, paymentDate, label };
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
export function getCurrentAndNextCycle(reference: Date = new Date()) {
  const current = computePaymentCycle(reference);
  // Next cycle starts where current ends
  const next = computePaymentCycle(current.cycleEnd);
  return { current, next };
}
