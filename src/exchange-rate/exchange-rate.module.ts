import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyModule } from '@/currency/currency.module';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { ExchangeRateController } from '@/exchange-rate/exchange-rate.controller';
import { ExchangeRateService } from '@/exchange-rate/exchange-rate.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRate]), CurrencyModule],
  controllers: [ExchangeRateController],
  providers: [ExchangeRateService],
  exports: [TypeOrmModule, ExchangeRateService],
})
export class ExchangeRateModule {}
