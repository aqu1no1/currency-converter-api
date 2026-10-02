import { RatesResponse } from '@/integrations/frankfurter/frankfurter.schemas';
import { ProviderRate } from '@ports/exchange-rate-provider.port';

export function toProviderRates(rows: RatesResponse): ProviderRate[] {
  return rows.map((row) => ({
    currencyCode: row.quote,
    rate: String(row.rate),
    rateDate: row.date,
  }));
}
