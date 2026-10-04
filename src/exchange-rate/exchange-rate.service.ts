import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { I18nService } from 'nestjs-i18n';
import { In, Repository } from 'typeorm';
import { Currency } from '@/currency/entities/currency.entity';
import { ConvertResponseDto } from '@/exchange-rate/dto/convert-response.dto';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { I18nTranslations } from '@/generated/i18n.generated';
import { BASE_CURRENCY } from '@constants/currency.constants';

const RATE_DECIMAL_PLACES = 6;
const RESULT_DECIMAL_PLACES = 2;

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepository: Repository<ExchangeRate>,
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  private async VerifyCode({ code }: { code: string }): Promise<Currency> {
    const currency = await this.currencyRepository.findOne({ where: { code } });

    if (!currency) {
      throw new BadRequestException(
        this.i18n.t('errors.UNSUPPORTED', {
          args: { entity: this.i18n.t('t.CURRENCY') },
        }),
      );
    }

    return currency;
  }

  private async findLatestCommonDate({
    currencyIds,
  }: {
    currencyIds: string[];
  }): Promise<string | undefined> {
    const query = this.exchangeRateRepository
      .createQueryBuilder('er')
      .select('er.rate_date::text', 'rateDate')
      .groupBy('er.rate_date')
      .orderBy('er.rate_date', 'DESC')
      .limit(1);

    if (currencyIds.length > 0) {
      query
        .where('er.currency_id IN (:...currencyIds)', { currencyIds })
        .having('COUNT(DISTINCT er.currency_id) = :count', { count: currencyIds.length });
    }

    const row = await query.getRawOne<{ rateDate: string }>();
    return row?.rateDate;
  }

  async findAllExchangeRates(): Promise<ExchangeRate[]> {
    this.logger.log('Fetching all exchange rates from the database');
    return this.exchangeRateRepository.find({ order: { rateDate: 'DESC' } });
  }

  async convertCoins({
    amount,
    to,
    from,
  }: {
    amount: string;
    to: string;
    from: string;
  }): Promise<ConvertResponseDto> {
    const fromCurrency = await this.VerifyCode({ code: from });
    const toCurrency = await this.VerifyCode({ code: to });

    const quotedCurrencyIds = [
      ...new Set(
        [fromCurrency, toCurrency]
          .filter((currency) => currency.code !== BASE_CURRENCY.BASED)
          .map((currency) => currency.id),
      ),
    ];

    const date = await this.findLatestCommonDate({ currencyIds: quotedCurrencyIds });

    if (!date) {
      throw new ServiceUnavailableException(
        this.i18n.t('errors.UNAVAILABLE', {
          args: { entity: this.i18n.t('t.EXCHANGE_RATE') },
        }),
      );
    }

    const rates = await this.exchangeRateRepository.find({
      where: { currencyId: In(quotedCurrencyIds), rateDate: date },
    });

    const rateOf = (currency: Currency): Decimal => {
      if (currency.code === BASE_CURRENCY.BASED) return new Decimal(1);

      const rate = rates.find((exchangeRate) => exchangeRate.currencyId === currency.id);
      return new Decimal(rate!.rate);
    };

    const value = new Decimal(amount);
    const rate = rateOf(toCurrency).dividedBy(rateOf(fromCurrency));
    const result = value.times(rate);

    return {
      from,
      to,
      amount: value.toNumber(),
      rate: rate.toDecimalPlaces(RATE_DECIMAL_PLACES).toNumber(),
      result: result.toDecimalPlaces(RESULT_DECIMAL_PLACES).toNumber(),
      date,
    };
  }
}
