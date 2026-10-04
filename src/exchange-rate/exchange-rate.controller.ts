import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConvertResponseDto } from '@/exchange-rate/dto/convert-response.dto';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { ExchangeRateService } from '@/exchange-rate/exchange-rate.service';
import { ParseAmountPipe } from '@pipes/parse-amount.pipe';
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
    description:
      'Converte um valor entre duas moedas usando as cotações do dia mais recente em que as duas existem.',
  })
  @ApiQuery({ name: 'from', example: 'EUR' })
  @ApiQuery({ name: 'to', example: 'BRL' })
  @ApiQuery({ name: 'amount', type: 'string', example: '100' })
  @ApiOkResponse({ type: ConvertResponseDto, description: 'Resultado da conversão' })
  @ApiBadRequestResponse({ description: 'Moeda não suportada ou amount inválido ou negativo' })
  @ApiServiceUnavailableResponse({ description: 'Ainda não há cotações salvas' })
  convert(
    @Query('amount', ParseAmountPipe) amount: string,
    @Query('from', ParseCodePipe) from: string,
    @Query('to', ParseCodePipe) to: string,
  ): Promise<ConvertResponseDto> {
    return this.exchangeRateService.convertCoins({ amount, from, to });
  }
}
