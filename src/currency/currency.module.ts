import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyController } from '@/currency/currency.controller';
import { CurrencyService } from '@/currency/currency.service';
import { Currency } from '@/currency/entities/currency.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Currency])],
  controllers: [CurrencyController],
  providers: [CurrencyService],
})
export class CurrencyModule {}
