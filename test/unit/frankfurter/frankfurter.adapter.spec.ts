import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import nock from 'nock';
import { FrankfurterModule } from '@/integrations/frankfurter/frankfurter.module';
import {
  ExchangeRateProvider,
  ExchangeRateProviderUnavailableException,
} from '@ports/exchange-rate-provider.port';

const BASE_URL = 'https://frankfurter.test';
const RATES_PATH = '/v2/rates';
const RETRIES = 3;
const RETRY_TEST_TIMEOUT_IN_MS = 10_000;

const rangeParams = {
  base: 'USD',
  currencies: ['BRL', 'EUR'],
  start: '2000-01-01',
  end: '2000-12-31',
};

const validResponse = [
  { date: '2000-01-03', base: 'USD', quote: 'BRL', rate: 1.8 },
  { date: '2000-01-03', base: 'USD', quote: 'EUR', rate: 0.9847 },
];

describe('FrankfurterAdapter', () => {
  let provider: ExchangeRateProvider;

  beforeAll(async () => {
    nock.disableNetConnect();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ FRANKFURTER_BASE_URL: BASE_URL })],
        }),
        FrankfurterModule,
      ],
    }).compile();

    provider = moduleRef.get(ExchangeRateProvider);
  });

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  function mockRangeRequest() {
    return nock(BASE_URL).get(RATES_PATH).query({
      base: 'USD',
      quotes: 'BRL,EUR',
      from: '2000-01-01',
      to: '2000-12-31',
    });
  }

  function countedReply(status: number, body: unknown) {
    const counter = { calls: 0 };
    mockRangeRequest()
      .times(RETRIES + 2)
      .reply(() => {
        counter.calls += 1;
        return [status, body];
      });
    return counter;
  }

  it('converts a valid response to the port format', async () => {
    mockRangeRequest().reply(200, validResponse);

    await expect(provider.fetchRatesInRange(rangeParams)).resolves.toEqual([
      { currencyCode: 'BRL', rate: '1.8', rateDate: '2000-01-03' },
      { currencyCode: 'EUR', rate: '0.9847', rateDate: '2000-01-03' },
    ]);
  });

  it('sends base, quotes, from and to for a range', async () => {
    const scope = mockRangeRequest().reply(200, []);

    await provider.fetchRatesInRange(rangeParams);

    expect(scope.isDone()).toBe(true);
  });

  it('sends from as the given number of days ago and no to for recent rates', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));

    const scope = nock(BASE_URL)
      .get(RATES_PATH)
      .query({ base: 'USD', quotes: 'BRL,EUR', from: '2026-09-25' })
      .reply(200, []);

    await provider.fetchRecentRates({ base: 'USD', currencies: ['BRL', 'EUR'], days: 5 });

    expect(scope.isDone()).toBe(true);
  });

  it.each([
    ['a row with an invalid date', [{ ...validResponse[0], date: '03/01/2000' }]],
    ['a row without rate', [{ date: '2000-01-03', base: 'USD', quote: 'BRL' }]],
    ['a non-positive rate', [{ ...validResponse[0], rate: 0 }]],
    ['an object instead of a list', { rates: validResponse }],
  ])('throws the port exception for %s, without retrying', async (_, body) => {
    const counter = countedReply(200, body);

    await expect(provider.fetchRatesInRange(rangeParams)).rejects.toBeInstanceOf(
      ExchangeRateProviderUnavailableException,
    );
    expect(counter.calls).toBe(1);
  });

  it(
    'retries a 5xx error and throws the port exception after the last attempt',
    async () => {
      const counter = countedReply(503, { status: 503, message: 'unavailable' });

      await expect(provider.fetchRatesInRange(rangeParams)).rejects.toBeInstanceOf(
        ExchangeRateProviderUnavailableException,
      );
      expect(counter.calls).toBe(RETRIES + 1);
    },
    RETRY_TEST_TIMEOUT_IN_MS,
  );

  it(
    'recovers when a retry after a 5xx error succeeds',
    async () => {
      mockRangeRequest().reply(500);
      mockRangeRequest().reply(200, validResponse);

      await expect(provider.fetchRatesInRange(rangeParams)).resolves.toHaveLength(2);
    },
    RETRY_TEST_TIMEOUT_IN_MS,
  );

  it(
    'retries a network failure',
    async () => {
      const counter = { calls: 0 };
      mockRangeRequest()
        .times(RETRIES + 2)
        .replyWithError(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }))
        .on('request', () => {
          counter.calls += 1;
        });

      await expect(provider.fetchRatesInRange(rangeParams)).rejects.toBeInstanceOf(
        ExchangeRateProviderUnavailableException,
      );
      expect(counter.calls).toBe(RETRIES + 1);
    },
    RETRY_TEST_TIMEOUT_IN_MS,
  );

  it.each([400, 404, 422, 429])('does not retry a %i error', async (status) => {
    const counter = countedReply(status, { status, message: 'invalid currency: ABC' });

    await expect(provider.fetchRatesInRange(rangeParams)).rejects.toBeInstanceOf(
      ExchangeRateProviderUnavailableException,
    );
    expect(counter.calls).toBe(1);
  });
});
