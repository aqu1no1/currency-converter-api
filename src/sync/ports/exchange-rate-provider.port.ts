export interface ProviderRate {
  currencyCode: string;

  rate: string;

  rateDate: string;
}

interface RatesQuery {
  base: string;

  currencies: string[];
}

export interface FetchRecentRatesParams extends RatesQuery {
  days: number;
}

export interface FetchRatesInRangeParams extends RatesQuery {
  start: string;

  end: string;
}

export class ExchangeRateProviderUnavailableException extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'ExchangeRateProviderUnavailableException';
  }
}

export abstract class ExchangeRateProvider {
  abstract fetchRecentRates(params: FetchRecentRatesParams): Promise<ProviderRate[]>;

  abstract fetchRatesInRange(params: FetchRatesInRangeParams): Promise<ProviderRate[]>;
}
