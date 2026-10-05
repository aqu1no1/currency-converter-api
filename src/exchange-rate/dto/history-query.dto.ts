import { ApiProperty } from '@nestjs/swagger';
import { IsCurrencyCode } from '@decorators/is-currency-code.decorator';
import { IsDateOnly } from '@decorators/is-date-only.decorator';
import { LocalizedQueryDto } from '@dto/localized-query.dto';
import { HISTORY_MAX_YEARS } from '@constants/history.constants';

export class HistoryQueryDto extends LocalizedQueryDto {
  @ApiProperty({ example: 'EUR', description: 'Código ISO 4217 da moeda de origem' })
  @IsCurrencyCode()
  from: string;

  @ApiProperty({ example: 'BRL', description: 'Código ISO 4217 da moeda de destino' })
  @IsCurrencyCode()
  to: string;

  @ApiProperty({
    type: 'string',
    format: 'date',
    example: '2026-09-01',
    description: 'Início do período (AAAA-MM-DD), inclusive',
  })
  @IsDateOnly()
  start: string;

  @ApiProperty({
    type: 'string',
    format: 'date',
    example: '2026-09-28',
    description: `Fim do período (AAAA-MM-DD), inclusive. Igual ou posterior a start, com no máximo ${HISTORY_MAX_YEARS} anos de período`,
  })
  @IsDateOnly()
  end: string;
}
