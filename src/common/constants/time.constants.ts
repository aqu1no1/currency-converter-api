export const TIME_IN_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

export const TIME_IN_SECONDS = {
  SECOND: 1,
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
  MONTH: 30 * 24 * 60 * 60,
  YEAR: 365 * 24 * 60 * 60,
} as const;

export const TIME_IN_MINUTES = {
  SECOND: 1 / 60,
  MINUTE: 1,
  HOUR: 60,
  DAY: 24 * 60,
  WEEK: 7 * 24 * 60,
  MONTH: 30 * 24 * 60,
  YEAR: 365 * 24 * 60,
} as const;
