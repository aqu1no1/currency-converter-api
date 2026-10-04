import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { CurrencyService } from '@/currency/currency.service';
import { Currency } from '@/currency/entities/currency.entity';
import { ConvertResponseDto } from '@/exchange-rate/dto/convert-response.dto';
import { LatestRatesResponseDto } from '@/exchange-rate/dto/latest-rates-response.dto';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { I18nTranslations } from '@/generated/i18n.generated';
import { BASE_CURRENCY } from '@constants/currency.constants';

const RATE_DECIMAL_PLACES = 6;
const RESULT_DECIMAL_PLACES = 2;

type RatesByCode = Map<string, Decimal>;

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepository: Repository<ExchangeRate>,
    private readonly currencyService: CurrencyService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  async findAllExchangeRates(): Promise<ExchangeRate[]> {
    this.logger.log('Fetching all exchange rates from the database');
    return this.exchangeRateRepository.find({ order: { rateDate: 'DESC' } });
  }

  async convertCoins({
    amount,
    from,
    to,
  }: {
    amount: string;
    from: string;
    to: string;
  }): Promise<ConvertResponseDto> {
    const fromCurrency = await this.findCurrencyOrFail({ code: from });
    const toCurrency = await this.findCurrencyOrFail({ code: to });

    const date = await this.findLatestRateDateOrFail({
      currencyIds: this.nonBaseCurrencyIds([fromCurrency, toCurrency]),
    });
    const ratesByCode = await this.findRatesByCode({ date });

    const amountValue = new Decimal(amount);
    const rate = this.crossRate({ ratesByCode, from: fromCurrency.code, to: toCurrency.code });
    const result = amountValue.times(rate);

    return {
      from: fromCurrency.code,
      to: toCurrency.code,
      amount: amountValue.toNumber(),
      rate: this.roundRate(rate),
      result: result.toDecimalPlaces(RESULT_DECIMAL_PLACES).toNumber(),
      date,
    };
  }

  async getLatestExchangeRates({ base }: { base: string }): Promise<LatestRatesResponseDto> {
    const baseCurrency = await this.findCurrencyOrFail({
      code: base,
      exception: NotFoundException,
    });

    const date = await this.findLatestRateDateOrFail({
      currencyIds: this.nonBaseCurrencyIds([baseCurrency]),
    });
    const ratesByCode = await this.findRatesByCode({ date });

    const otherCodes = [...ratesByCode.keys()].filter((code) => code !== baseCurrency.code).sort();

    const rates = Object.fromEntries(
      otherCodes.map((code) => [
        code,
        this.roundRate(this.crossRate({ ratesByCode, from: baseCurrency.code, to: code })),
      ]),
    );

    return { base: baseCurrency.code, date, rates };
  }

  private async findCurrencyOrFail({
    code,
    exception = BadRequestException,
  }: {
    code: string;
    exception?: new (message: string) => HttpException;
  }): Promise<Currency> {
    const currency = await this.currencyService.findByCode({ code });

    if (!currency) {
      throw new exception(
        this.i18n.t('errors.UNSUPPORTED', {
          args: { entity: this.i18n.t('t.CURRENCY') },
        }),
      );
    }

    return currency;
  }

  private nonBaseCurrencyIds(currencies: Currency[]): string[] {
    const ids = currencies
      .filter((currency) => currency.code !== BASE_CURRENCY.BASED)
      .map((currency) => currency.id);

    return [...new Set(ids)];
  }

  private async findLatestRateDateOrFail({
    currencyIds,
  }: {
    currencyIds: string[];
  }): Promise<string> {
    const date = await this.findLatestRateDate({ currencyIds });

    if (!date) {
      throw new ServiceUnavailableException(
        this.i18n.t('errors.UNAVAILABLE', {
          args: { entity: this.i18n.t('t.EXCHANGE_RATE') },
        }),
      );
    }

    return date;
  }

  private async findLatestRateDate({
    currencyIds,
  }: {
    currencyIds: string[];
  }): Promise<string | undefined> {
    const latestDateQuery = this.exchangeRateRepository
      .createQueryBuilder('exchange_rate')
      .select('CAST(exchange_rate.rateDate AS text)', 'rateDate')
      .groupBy('exchange_rate.rateDate')
      .orderBy('exchange_rate.rateDate', 'DESC')
      .limit(1);

    if (currencyIds.length > 0) {
      latestDateQuery
        .where('exchange_rate.currencyId IN (:...currencyIds)', { currencyIds })
        .having('COUNT(DISTINCT exchange_rate.currencyId) = :currencyCount', {
          currencyCount: currencyIds.length,
        });
    }

    const latestDate = await latestDateQuery.getRawOne<{ rateDate: string }>();
    return latestDate?.rateDate;
  }

  private async findRatesByCode({ date }: { date: string }): Promise<RatesByCode> {
    const exchangeRates = await this.exchangeRateRepository.find({
      where: { rateDate: date },
      relations: { currency: true },
    });

    const ratesByCode: RatesByCode = new Map([[BASE_CURRENCY.BASED, new Decimal(1)]]);

    for (const exchangeRate of exchangeRates) {
      ratesByCode.set(exchangeRate.currency.code, new Decimal(exchangeRate.rate));
    }

    return ratesByCode;
  }

  private crossRate({
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

  private roundRate(rate: Decimal): number {
    return rate.toDecimalPlaces(RATE_DECIMAL_PLACES).toNumber();
  }
}
