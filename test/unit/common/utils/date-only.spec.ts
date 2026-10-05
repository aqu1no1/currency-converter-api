import { addYearsToDateOnly } from '@utils/date-only';

describe('addYearsToDateOnly', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('adds years keeping the month and day', () => {
    expect(addYearsToDateOnly('2024-09-15', 2)).toBe('2026-09-15');
  });

  it('subtracts years when the value is negative', () => {
    expect(addYearsToDateOnly('2026-01-10', -3)).toBe('2023-01-10');
  });

  it('returns the same date when adding zero years', () => {
    expect(addYearsToDateOnly('2026-09-28', 0)).toBe('2026-09-28');
  });

  it('keeps the first and last day of the year', () => {
    expect(addYearsToDateOnly('2000-01-01', 1)).toBe('2001-01-01');
    expect(addYearsToDateOnly('2025-12-31', 1)).toBe('2026-12-31');
  });

  it('keeps February 29 when the target year is also a leap year', () => {
    expect(addYearsToDateOnly('2024-02-29', 4)).toBe('2028-02-29');
  });

  it('rolls February 29 over to March 1 when the target year is not a leap year', () => {
    expect(addYearsToDateOnly('2024-02-29', 2)).toBe('2026-03-01');
  });

  it('ignores the machine time zone', () => {
    vi.stubEnv('TZ', 'America/Sao_Paulo');

    expect(addYearsToDateOnly('2026-01-01', 1)).toBe('2027-01-01');
  });

  it('returns a zero-padded date that can be compared as text', () => {
    const limit = addYearsToDateOnly('2024-03-05', 2);

    expect(limit).toBe('2026-03-05');
    expect('2026-03-04' <= limit).toBe(true);
    expect('2026-03-06' > limit).toBe(true);
  });
});
