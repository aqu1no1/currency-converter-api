import type { ExchangeRateProvider } from '@ports/exchange-rate-provider.port';

export class FakeExchangeRateProvider implements ExchangeRateProvider {
  readonly fetchRecentRates = vi.fn<ExchangeRateProvider['fetchRecentRates']>();
  readonly fetchRatesInRange = vi.fn<ExchangeRateProvider['fetchRatesInRange']>();

  constructor() {
    this.reset();
  }

  reset(): void {
    this.fetchRecentRates.mockReset().mockResolvedValue([]);
    this.fetchRatesInRange.mockReset().mockResolvedValue([]);
  }
}
