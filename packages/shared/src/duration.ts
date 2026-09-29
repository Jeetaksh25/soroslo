const DURATION_RE = /^(\d+)(ms|s|m|h|d)$/;

const MULTIPLIERS = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000
} as const;

export function parseDurationMs(value: string): number {
  const match = DURATION_RE.exec(value);
  if (!match) {
    throw new TypeError(`Invalid duration '${value}'`);
  }

  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof MULTIPLIERS;
  const milliseconds = amount * MULTIPLIERS[unit];

  if (!Number.isSafeInteger(milliseconds)) {
    throw new RangeError(`Duration '${value}' exceeds the safe integer range`);
  }

  return milliseconds;
}

export function isDuration(value: string): boolean {
  try {
    parseDurationMs(value);
    return true;
  } catch {
    return false;
  }
}
