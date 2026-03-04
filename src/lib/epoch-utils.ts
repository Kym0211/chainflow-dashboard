import { addDays, subDays, format, differenceInDays, startOfDay } from "date-fns";

/**
 * Solana epoch ↔ date conversion utilities.
 *
 * We use a known reference point and the average epoch duration to estimate
 * dates for arbitrary epochs. This is approximate (epoch duration varies
 * slightly) but is accurate enough for a date range picker.
 *
 * Reference: Epoch 730 started ≈ 2024-11-10
 */
const REFERENCE_EPOCH = 730;
const REFERENCE_DATE = new Date("2024-11-10T00:00:00Z");
const AVG_EPOCH_DURATION_DAYS = 2.5; // ~2–3 days per epoch

/** Estimate the start date of a given epoch */
export function epochToDate(epoch: number): Date {
  const diff = epoch - REFERENCE_EPOCH;
  return addDays(REFERENCE_DATE, diff * AVG_EPOCH_DURATION_DAYS);
}

/** Estimate which epoch a given date falls in */
export function dateToEpoch(date: Date): number {
  const daysDiff = differenceInDays(startOfDay(date), startOfDay(REFERENCE_DATE));
  return Math.round(REFERENCE_EPOCH + daysDiff / AVG_EPOCH_DURATION_DAYS);
}

/** Format an epoch number with its approximate date */
export function epochLabel(epoch: number): string {
  const date = epochToDate(epoch);
  return `E${epoch} · ${format(date, "MMM d, yyyy")}`;
}

/** Get epoch range for a "last N epochs" preset */
export function lastNEpochsRange(currentEpoch: number, n: number) {
  return {
    fromEpoch: currentEpoch - n + 1,
    toEpoch: currentEpoch,
  };
}