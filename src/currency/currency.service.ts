import { Injectable, Logger } from '@nestjs/common';
import { Currency } from '@/currency/entities/currency.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
  ) {}

  async findAllCurrencies(): Promise<Currency[]> {
    this.logger.log('Fetching all currencies from the database');
    return this.currencyRepository.find({ order: { code: 'ASC' } });
  }

  findByCode({ code }: { code: string }): Promise<Currency | null> {
    return this.currencyRepository.findOne({ where: { code } });
  }
}
