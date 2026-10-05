import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsCurrencyCode } from '@decorators/is-currency-code.decorator';
import { PaginationQueryDto } from '@dto/pagination-query.dto';

export class FindExchangeRatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'BRL', description: 'Filtra pelo código da moeda' })
  @IsOptional()
  @IsCurrencyCode()
  code?: string;
}
