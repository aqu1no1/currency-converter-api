import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { Currency } from '@/currency/entities/currency.entity';
import { ExchangeRate } from '@/currency/entities/exchange-rate.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
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

  async findAllCurrencies(): Promise<Currency[]> {
    this.logger.log('Fetching all currencies from the database');
    return this.currencyRepository.find({ order: { code: 'ASC' } });
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
