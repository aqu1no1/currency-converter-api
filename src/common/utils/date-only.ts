export function addYearsToDateOnly(date: string, years: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result.toISOString().slice(0, 10);
}
