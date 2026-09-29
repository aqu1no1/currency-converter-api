import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrencyService } from '@/currency/currency.service';
import { Currency } from '@/currency/entities/currency.entity';
import { ExchangeRate } from '@/currency/entities/exchange-rate.entity';
import { ParseCodePipe } from '@pipes/validate-code.pipe';

@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as moedas',
    description: 'Retorna todas as moedas cadastradas.',
  })
  @ApiOkResponse({ type: [Currency], description: 'Lista de moedas' })
  findAll(): Promise<Currency[]> {
    return this.currencyService.findAllCurrencies();
  }

  @Get('convert')
  @ApiOperation({
    summary: 'Converter moedas',
    description: 'Converte um valor entre duas moedas.',
  })
  convert(
    @Query('amount', ParseIntPipe) amount: number,
    @Query('from', ParseCodePipe) from: string,
    @Query('to', ParseCodePipe) to: string,
  ): Promise<ExchangeRate> {
    return this.currencyService.convertCoins({ amount, from, to });
  }
}
