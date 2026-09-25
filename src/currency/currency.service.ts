import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  findAll(): string[] {
    this.logger.debug('Listando moedas');
    return [];
  }
}
