import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { Currency } from '@/currency/entities/currency.entity';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { I18nTranslations } from '@/generated/i18n.generated';

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
      throw new NotFoundException(
        this.i18n.t('errors.NOT_FOUND', {
          args: { entity: this.i18n.t('t.CODE') },
        }),
      );
    }

    return currency;
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
    amount: number;
    to: string;
    from: string;
  }): Promise<ExchangeRate> {
    if (amount < 0) {
      throw new BadRequestException(
        this.i18n.t('errors.NEGATIVE', {
          args: { entity: this.i18n.t('t.AMOUNT') },
        }),
      );
    }

    await this.VerifyCode({ code: to });
    await this.VerifyCode({ code: from });

    // TODO: calcular a conversão
    throw new NotImplementedException();
  }
}
