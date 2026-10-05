import { HttpModule, HttpService } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { AxiosInstance } from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import { frankfurterConfig } from '@/config';
import { FrankfurterAdapter } from '@/integrations/frankfurter/frankfurter.adapter';
import { ExchangeRateProvider } from '@ports/exchange-rate-provider.port';
import { TIME_IN_MS } from '@constants/time.constants';

const TIMEOUT_IN_MS = 10 * TIME_IN_MS.SECOND;
const RETRIES = 3;

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [frankfurterConfig.KEY],
      useFactory: (frankfurter: ConfigType<typeof frankfurterConfig>) => ({
        baseURL: frankfurter.baseUrl,
        timeout: TIMEOUT_IN_MS,
      }),
    }),
  ],
  providers: [{ provide: ExchangeRateProvider, useClass: FrankfurterAdapter }],
  exports: [ExchangeRateProvider],
})
export class FrankfurterModule {
  constructor(http: HttpService) {
    axiosRetry(http.axiosRef as AxiosInstance, {
      retries: RETRIES,
      retryDelay: exponentialDelay,
      shouldResetTimeout: true,
      retryCondition: (error) => !error.response || error.response.status >= 500,
    });
  }
}
