import { ServiceUnavailableException } from '@nestjs/common';
import { Currency } from '@/currency/entities/currency.entity';
import { ExchangeRateService } from '@/exchange-rate/exchange-rate.service';
import { createTestingApp, type TestingApp } from '../utils/create-testing-app';
import { resetDatabase } from '../utils/database';
import { seedRates } from '../utils/seeds';

describe('ExchangeRateService (integration)', () => {
  let ctx: TestingApp;
  let service: ExchangeRateService;
  let currencyIdByCode: Map<string, string>;
  let currencyCodeById: Map<string, string>;

  beforeAll(async () => {
    ctx = await createTestingApp();
    service = ctx.app.get(ExchangeRateService);

    const currencies = await ctx.dataSource.getRepository(Currency).find();
    currencyIdByCode = new Map(currencies.map((currency) => [currency.code, currency.id]));
    currencyCodeById = new Map(currencies.map((currency) => [currency.id, currency.code]));
  });

  beforeEach(async () => {
    await resetDatabase(ctx.dataSource);
  });

  afterAll(async () => {
    await ctx?.close();
  });

  const idsOf = (...codes: string[]) => codes.map((code) => currencyIdByCode.get(code)!);

  describe('findLatestRateDate', () => {
    it('returns the latest day on which every requested currency has a rate', async () => {
      await seedRates(ctx.dataSource, { date: '2026-09-28', rates: { BRL: '5.42', EUR: '0.92' } });
      await seedRates(ctx.dataSource, { date: '2026-09-29', rates: { BRL: '5.43' } });

      await expect(service.findLatestRateDate({ currencyIds: idsOf('BRL', 'EUR') })).resolves.toBe(
        '2026-09-28',
      );
      await expect(service.findLatestRateDate({ currencyIds: idsOf('BRL') })).resolves.toBe(
        '2026-09-29',
      );
    });

    it('returns the latest day of the table when no currency is requested', async () => {
      await seedRates(ctx.dataSource, { date: '2026-09-28', rates: { BRL: '5.42', EUR: '0.92' } });
      await seedRates(ctx.dataSource, { date: '2026-09-29', rates: { JPY: '148.1' } });

      await expect(service.findLatestRateDate()).resolves.toBe('2026-09-29');
    });

    it('returns undefined when no requested currency has a rate on the same day', async () => {
      await seedRates(ctx.dataSource, { date: '2026-09-28', rates: { BRL: '5.42' } });
      await seedRates(ctx.dataSource, { date: '2026-09-29', rates: { EUR: '0.92' } });

      await expect(
        service.findLatestRateDate({ currencyIds: idsOf('BRL', 'EUR') }),
      ).resolves.toBeUndefined();
    });

    it('returns undefined when the database is empty', async () => {
      await expect(service.findLatestRateDate()).resolves.toBeUndefined();
    });
  });

  describe('convertCoins', () => {
    it('uses the latest day on which both currencies have a rate', async () => {
      await seedRates(ctx.dataSource, { date: '2026-09-28', rates: { BRL: '5.52', EUR: '0.92' } });
      await seedRates(ctx.dataSource, { date: '2026-09-29', rates: { BRL: '9.99' } });

      await expect(
        service.convertCoins({ amount: '100', from: 'EUR', to: 'BRL' }),
      ).resolves.toEqual({
        from: 'EUR',
        to: 'BRL',
        amount: 100,
        rate: 6,
        result: 600,
        date: '2026-09-28',
      });
    });

    it('keeps the precision of a rate with many decimal places', async () => {
      await seedRates(ctx.dataSource, {
        date: '2026-09-28',
        rates: { BRL: '5.123456789012345678' },
      });

      await expect(
        service.convertCoins({ amount: '1000000000', from: 'USD', to: 'BRL' }),
      ).resolves.toEqual({
        from: 'USD',
        to: 'BRL',
        amount: 1000000000,
        rate: 5.123457,
        result: 5123456789.01,
        date: '2026-09-28',
      });
    });

    it('rounds with Decimal instead of floating point', async () => {
      await seedRates(ctx.dataSource, { date: '2026-09-28', rates: { BRL: '1' } });

      await expect(
        service.convertCoins({ amount: '1.005', from: 'USD', to: 'BRL' }),
      ).resolves.toMatchObject({ result: 1.01 });
    });

    it('throws when there is no rate for the currencies', async () => {
      await expect(
        service.convertCoins({ amount: '100', from: 'EUR', to: 'BRL' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('getLatestExchangeRates', () => {
    it('returns the rates of the latest day with the base currency, crossed by Decimal', async () => {
      await seedRates(ctx.dataSource, {
        date: '2026-09-28',
        rates: { BRL: '5.4321', EUR: '0.92', JPY: '148.123456789' },
      });
      await seedRates(ctx.dataSource, { date: '2026-09-29', rates: { BRL: '5.5' } });

      await expect(service.getLatestExchangeRates({ base: 'EUR' })).resolves.toEqual({
        base: 'EUR',
        date: '2026-09-28',
        rates: { BRL: 5.904457, JPY: 161.003757, USD: 1.086957 },
      });
    });

    it('uses the latest day of the table when the base is USD', async () => {
      await seedRates(ctx.dataSource, { date: '2026-09-28', rates: { BRL: '5.42', EUR: '0.92' } });
      await seedRates(ctx.dataSource, { date: '2026-09-29', rates: { BRL: '5.43' } });

      await expect(service.getLatestExchangeRates({ base: 'USD' })).resolves.toEqual({
        base: 'USD',
        date: '2026-09-29',
        rates: { BRL: 5.43 },
      });
    });
  });

  describe('getExchangeRateHistory', () => {
    beforeEach(async () => {
      await seedRates(ctx.dataSource, { date: '2026-09-05', rates: { BRL: '5.5', EUR: '1.1' } });
      await seedRates(ctx.dataSource, { date: '2026-09-01', rates: { BRL: '5.2', EUR: '0.8' } });
      await seedRates(ctx.dataSource, { date: '2026-09-04', rates: { BRL: '5.4', EUR: '0.9' } });
      await seedRates(ctx.dataSource, { date: '2026-09-02', rates: { BRL: '5.0', EUR: '1.0' } });
      await seedRates(ctx.dataSource, { date: '2026-09-03', rates: { BRL: '5.3' } });
    });

    it('filters by the period with both ends included, oldest first, skipping incomplete days', async () => {
      await expect(
        service.getExchangeRateHistory({
          from: 'EUR',
          to: 'BRL',
          start: '2026-09-02',
          end: '2026-09-04',
        }),
      ).resolves.toEqual({
        from: 'EUR',
        to: 'BRL',
        history: [
          { date: '2026-09-02', rate: 5 },
          { date: '2026-09-04', rate: 6 },
        ],
      });
    });

    it('returns every day of the currency when the other one is the base', async () => {
      const { history } = await service.getExchangeRateHistory({
        from: 'USD',
        to: 'BRL',
        start: '2026-09-01',
        end: '2026-09-05',
      });

      expect(history).toEqual([
        { date: '2026-09-01', rate: 5.2 },
        { date: '2026-09-02', rate: 5 },
        { date: '2026-09-03', rate: 5.3 },
        { date: '2026-09-04', rate: 5.4 },
        { date: '2026-09-05', rate: 5.5 },
      ]);
    });

    it('returns an empty history when the period has no rates', async () => {
      const { history } = await service.getExchangeRateHistory({
        from: 'EUR',
        to: 'BRL',
        start: '2026-08-01',
        end: '2026-08-31',
      });

      expect(history).toEqual([]);
    });
  });

  describe('findAllExchangeRates', () => {
    beforeEach(async () => {
      await seedRates(ctx.dataSource, { date: '2026-09-27', rates: { JPY: '148.1', BRL: '5.41' } });
      await seedRates(ctx.dataSource, {
        date: '2026-09-28',
        rates: { EUR: '0.92', BRL: '5.123456789012345678', JPY: '148.2' },
      });
    });

    const summarize = (rates: { currencyId: string; rateDate: string; rate: string }[]) =>
      rates.map(({ currencyId, rateDate, rate }) => [
        rateDate,
        currencyCodeById.get(currencyId),
        rate,
      ]);

    it('orders by date DESC and code ASC, keeping the numeric as a string', async () => {
      const response = await service.findAllExchangeRates({ page: 1, perPage: 10 });

      expect(summarize(response.data)).toEqual([
        ['2026-09-28', 'BRL', '5.123456789012345678'],
        ['2026-09-28', 'EUR', '0.92'],
        ['2026-09-28', 'JPY', '148.2'],
        ['2026-09-27', 'BRL', '5.41'],
        ['2026-09-27', 'JPY', '148.1'],
      ]);
      expect(response).toMatchObject({ total: 5, page: 1, perPage: 10, totalPages: 1 });
    });

    it('paginates', async () => {
      const response = await service.findAllExchangeRates({ page: 2, perPage: 2 });

      expect(summarize(response.data)).toEqual([
        ['2026-09-28', 'JPY', '148.2'],
        ['2026-09-27', 'BRL', '5.41'],
      ]);
      expect(response).toMatchObject({ total: 5, page: 2, perPage: 2, totalPages: 3 });
    });

    it('filters by code', async () => {
      const response = await service.findAllExchangeRates({ page: 1, perPage: 10, code: 'JPY' });

      expect(summarize(response.data)).toEqual([
        ['2026-09-28', 'JPY', '148.2'],
        ['2026-09-27', 'JPY', '148.1'],
      ]);
      expect(response).toMatchObject({ total: 2, totalPages: 1 });
    });
  });
});
