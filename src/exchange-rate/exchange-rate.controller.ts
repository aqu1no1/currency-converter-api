import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { ExchangeRateService } from '@/exchange-rate/exchange-rate.service';
import { ParseCodePipe } from '@pipes/parse-code.pipe';

@ApiTags('exchange-rates')
@Controller('exchange-rates')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as cotações',
    description: 'Retorna todas as cotações cadastradas, da mais recente para a mais antiga.',
  })
  @ApiOkResponse({ type: [ExchangeRate], description: 'Lista de cotações' })
  findAll(): Promise<ExchangeRate[]> {
    return this.exchangeRateService.findAllExchangeRates();
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
    return this.exchangeRateService.convertCoins({ amount, from, to });
  }
}
