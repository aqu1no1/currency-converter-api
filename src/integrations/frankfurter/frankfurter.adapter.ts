import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { toProviderRates } from '@/integrations/frankfurter/frankfurter.mapper';
import { ratesResponseSchema } from '@/integrations/frankfurter/frankfurter.schemas';
import {
  ExchangeRateProvider,
  ExchangeRateProviderUnavailableException,
  FetchRatesInRangeParams,
  FetchRecentRatesParams,
  ProviderRate,
} from '@ports/exchange-rate-provider.port';
import { TIME_IN_MS } from '@utils/time-const';

const RATES_PATH = '/v2/rates';

@Injectable()
export class FrankfurterAdapter implements ExchangeRateProvider {
  private readonly logger = new Logger(FrankfurterAdapter.name);

  constructor(private readonly http: HttpService) {}

  fetchRecentRates({ base, currencies, days }: FetchRecentRatesParams): Promise<ProviderRate[]> {
    const from = new Date(Date.now() - days * TIME_IN_MS.DAY).toISOString().slice(0, 10);

    return this.fetchRates({ base, quotes: currencies.join(','), from });
  }

  fetchRatesInRange({
    base,
    currencies,
    start,
    end,
  }: FetchRatesInRangeParams): Promise<ProviderRate[]> {
    return this.fetchRates({ base, quotes: currencies.join(','), from: start, to: end });
  }

  private async fetchRates(params: Record<string, string>): Promise<ProviderRate[]> {
    this.logger.verbose(`Fetching rates from Frankfurter: ${JSON.stringify(params)}`);

    const data = await this.request(params);
    const parsed = ratesResponseSchema.safeParse(data);

    if (!parsed.success) {
      this.logger.error(`Invalid response from Frankfurter: ${parsed.error.message}`);
      throw new ExchangeRateProviderUnavailableException(
        'Frankfurter returned an invalid response',
        parsed.error,
      );
    }

    return toProviderRates(parsed.data);
  }

  private async request(params: Record<string, string>): Promise<unknown> {
    try {
      const response = await firstValueFrom(this.http.get<unknown>(RATES_PATH, { params }));

      return response.data;
    } catch (error) {
      this.logger.error(`Request to Frankfurter failed: ${String(error)}`);
      throw new ExchangeRateProviderUnavailableException('Request to Frankfurter failed', error);
    }
  }
}
