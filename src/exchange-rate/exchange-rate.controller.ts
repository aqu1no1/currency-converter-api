import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConvertResponseDto } from '@/exchange-rate/dto/convert-response.dto';
import { FindExchangeRatesQueryDto } from '@/exchange-rate/dto/find-exchange-rates-query.dto';
import { HistoryQueryDto } from '@/exchange-rate/dto/history-query.dto';
import { HistoryResponseDto } from '@/exchange-rate/dto/history-response.dto';
import { LatestRatesResponseDto } from '@/exchange-rate/dto/latest-rates-response.dto';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { ExchangeRateService } from '@/exchange-rate/exchange-rate.service';
import { ApiPaginatedResponse } from '@decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '@dto/paginated-response.dto';
import { ParseAmountPipe } from '@pipes/parse-amount.pipe';
import { ParseCodePipe } from '@pipes/parse-code.pipe';

@ApiTags('exchange-rates')
@Controller('exchange-rates')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as cotações',
    description:
      'Retorna as cotações paginadas, da data mais recente para a mais antiga e pelo código da moeda.',
  })
  @ApiPaginatedResponse(ExchangeRate, 'Cotações paginadas')
  @ApiBadRequestResponse({ description: 'Parâmetros de paginação ou filtros inválidos' })
  findAll(@Query() query: FindExchangeRatesQueryDto): Promise<PaginatedResponseDto<ExchangeRate>> {
    return this.exchangeRateService.findAllExchangeRates(query);
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

  @Get('history')
  @ApiOperation({
    summary: 'Histórico de um par',
    description:
      'Retorna a taxa diária de from para to no período, da data mais antiga para a mais recente.',
  })
  @ApiOkResponse({ type: HistoryResponseDto, description: 'Histórico do par no período' })
  @ApiBadRequestResponse({
    description:
      'Moeda não suportada, código ou data em formato inválido, start depois de end ou período acima do limite',
  })
  history(@Query() query: HistoryQueryDto): Promise<HistoryResponseDto> {
    return this.exchangeRateService.getExchangeRateHistory(query);
  }

  @Get('latest/:base')
  @ApiOperation({
    summary: 'Últimas cotações',
    description: 'Retorna as últimas cotações de todas as moedas em relação a uma moeda base.',
  })
  @ApiParam({ name: 'base', example: 'EUR' })
  @ApiOkResponse({ type: LatestRatesResponseDto, description: 'Cotações em relação à base' })
  @ApiNotFoundResponse({ description: 'Moeda não suportada' })
  @ApiServiceUnavailableResponse({ description: 'Ainda não há cotações salvas' })
  latest(@Param('base', ParseCodePipe) base: string): Promise<LatestRatesResponseDto> {
    return this.exchangeRateService.getLatestExchangeRates({ base });
  }
}
