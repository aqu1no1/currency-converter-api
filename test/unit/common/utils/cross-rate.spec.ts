import Decimal from 'decimal.js';
import {
  convertAmount,
  crossRate,
  newRatesByCode,
  type RatesByCode,
  roundRate,
  roundResult,
} from '@utils/cross-rate';
import { BASE_CURRENCY } from '@constants/currency.constants';

function ratesOf(rates: Record<string, string>): RatesByCode {
  const ratesByCode = newRatesByCode();

  for (const [code, rate] of Object.entries(rates)) {
    ratesByCode.set(code, new Decimal(rate));
  }

  return ratesByCode;
}

describe('cross rate', () => {
  const ratesByCode = ratesOf({ EUR: '0.92', BRL: '5.42' });

  it('starts every day with the base currency at rate 1', () => {
    expect(newRatesByCode().get(BASE_CURRENCY.BASED)?.toString()).toBe('1');
  });

  it('crosses EUR to BRL through the base: rate(BRL) / rate(EUR)', () => {
    expect(roundRate(crossRate({ ratesByCode, from: 'EUR', to: 'BRL' }))).toBe(5.891304);
  });

  it('uses the stored rate as is from the base to another currency', () => {
    expect(roundRate(crossRate({ ratesByCode, from: 'USD', to: 'BRL' }))).toBe(5.42);
  });

  it('inverts the stored rate from another currency to the base', () => {
    expect(roundRate(crossRate({ ratesByCode, from: 'BRL', to: 'USD' }))).toBe(0.184502);
  });

  it.each(['USD', 'EUR', 'BRL'])('returns 1 when from and to are both %s', (code) => {
    expect(roundRate(crossRate({ ratesByCode, from: code, to: code }))).toBe(1);
  });

  it('rounds the rate to 6 places and the result to 2', () => {
    const rate = crossRate({ ratesByCode, from: 'EUR', to: 'BRL' });

    expect(roundRate(rate)).toBe(5.891304);
    expect(roundResult(convertAmount({ amount: '100', rate }))).toBe(589.13);
  });

  it('rounds only at the end, never the rate before multiplying', () => {
    const rate = crossRate({ ratesByCode, from: 'EUR', to: 'BRL' });
    const roundedTooEarly = convertAmount({
      amount: '1000000',
      rate: new Decimal(roundRate(rate)),
    });

    expect(roundResult(convertAmount({ amount: '1000000', rate }))).toBe(5891304.35);
    expect(roundResult(roundedTooEarly)).toBe(5891304);
  });

  it('returns the exact amount when converting back and forth', () => {
    const rate = crossRate({ ratesByCode, from: 'BRL', to: 'USD' });

    expect(roundResult(convertAmount({ amount: '542', rate }))).toBe(100);
  });

  it('divides values that float gets wrong', () => {
    const floatRates = ratesOf({ AAA: '0.1', BBB: '0.3' });

    expect(0.3 / 0.1).not.toBe(3);
    expect(crossRate({ ratesByCode: floatRates, from: 'AAA', to: 'BBB' }).toString()).toBe('3');
  });

  it('multiplies values that float gets wrong', () => {
    expect(1.15 * 100).not.toBe(115);
    expect(convertAmount({ amount: '1.15', rate: new Decimal(100) }).toString()).toBe('115');
  });

  it('keeps many decimal places without drifting', () => {
    const preciseRates = ratesOf({ JPY: '149.123456789', ARS: '1234.987654321' });
    const rate = crossRate({ ratesByCode: preciseRates, from: 'JPY', to: 'ARS' });

    expect(roundRate(rate)).toBe(8.281646);
    expect(roundResult(convertAmount({ amount: '0.01', rate }))).toBe(0.08);
  });
});
