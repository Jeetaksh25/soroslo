/**
 * @file schedule-jitter.ts
 * @description Deterministic schedule offsets that spread checks with the same
 *   interval instead of letting them fire together.
 * @package @soroslo/shared
 * @license Apache-2.0
 */
import { createHash } from "node:crypto";

/** The largest share of an interval that jitter may move a run. */
export const MAX_JITTER_FRACTION = 0.2;

/**
 * Derive a stable offset in `[0, span)` from a check identity.
 *
 * The value is a pure function of the identity, so a process restart produces
 * exactly the same offset and the schedule does not reshuffle. `crypto` is used
 * for a well-distributed digest rather than for secrecy: the input is a check
 * id, not a secret, and no randomness is involved.
 */
export function deterministicJitterMs(identity: string, span: number): number {
  if (!Number.isSafeInteger(span) || span < 0) {
    throw new RangeError("Jitter span must be a non-negative safe integer");
  }
  if (span === 0) return 0;

  const digest = createHash("sha256").update(identity, "utf8").digest();
  // Read the first 48 bits, which is well inside the exact-integer range.
  const value =
    digest[0]! * 2 ** 40 + digest[1]! * 2 ** 32 + digest[2]! * 2 ** 24 +
    digest[3]! * 2 ** 16 + digest[4]! * 2 ** 8 + digest[5]!;

  return value % span;
}

/**
 * The offset applied to a check's schedule, bounded by the configured policy.
 *
 * `jitterFraction` is the share of the interval that may be used, clamped to
 * `[0, MAX_JITTER_FRACTION]`. A fraction of `0` disables jitter entirely, which
 * keeps existing behaviour as the default.
 */
export function scheduleJitterMs(
  checkId: string,
  intervalMs: number,
  jitterFraction: number
): number {
  if (!Number.isFinite(jitterFraction) || jitterFraction <= 0) return 0;
  if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0) return 0;

  const effective = Math.min(jitterFraction, MAX_JITTER_FRACTION);
  const span = Math.floor(intervalMs * effective);
  if (span <= 0) return 0;

  return deterministicJitterMs(checkId, span);
}

/**
 * Apply jitter to an already-computed schedule time.
 *
 * Only ever moves a run later. Moving a run earlier would fire it before the
 * interval that the operator configured has elapsed, so the offset is added.
 * The result is rounded to whole seconds so a stored timestamp is readable and
 * stable across serialization.
 */
export function applyScheduleJitter(
  scheduledAt: string | Date,
  checkId: string,
  intervalMs: number,
  jitterFraction: number
): string {
  const baseMs =
    scheduledAt instanceof Date ? scheduledAt.getTime() : Date.parse(scheduledAt);
  if (!Number.isFinite(baseMs)) {
    throw new TypeError("Scheduled timestamp must be a valid date");
  }

  const offset = scheduleJitterMs(checkId, intervalMs, jitterFraction);
  if (offset === 0) return new Date(baseMs).toISOString();

  const shifted = baseMs + offset;
  return new Date(Math.ceil(shifted / 1_000) * 1_000).toISOString();
}
