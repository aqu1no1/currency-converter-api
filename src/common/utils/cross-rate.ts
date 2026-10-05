import Decimal from 'decimal.js';
import { BASE_CURRENCY } from '@constants/currency.constants';

const RATE_DECIMAL_PLACES = 6;
const RESULT_DECIMAL_PLACES = 2;

export type RatesByCode = Map<string, Decimal>;

export function newRatesByCode(): RatesByCode {
  return new Map([[BASE_CURRENCY.BASED, new Decimal(1)]]);
}

export function crossRate({
  ratesByCode,
  from,
  to,
}: {
  ratesByCode: RatesByCode;
  from: string;
  to: string;
}): Decimal {
  return ratesByCode.get(to)!.dividedBy(ratesByCode.get(from)!);
}

export function convertAmount({ amount, rate }: { amount: string; rate: Decimal }): Decimal {
  return new Decimal(amount).times(rate);
}

export function roundRate(rate: Decimal): number {
  return rate.toDecimalPlaces(RATE_DECIMAL_PLACES).toNumber();
}

export function roundResult(result: Decimal): number {
  return result.toDecimalPlaces(RESULT_DECIMAL_PLACES).toNumber();
}
