import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrencyService } from '@/currency/currency.service';
import { Currency } from '@/currency/entities/currency.entity';

@ApiTags('currencies')
@Controller('currencies')
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
}
