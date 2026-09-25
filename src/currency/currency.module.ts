import { Module } from '@nestjs/common';
import { CurrencyController } from '@/currency/currency.controller';
import { CurrencyService } from '@/currency/currency.service';

@Module({
  controllers: [CurrencyController],
  providers: [CurrencyService],
})
export class CurrencyModule {}
