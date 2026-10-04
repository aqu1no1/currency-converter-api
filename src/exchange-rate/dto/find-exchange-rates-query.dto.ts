import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import type { I18nTranslations } from '@/generated/i18n.generated';
import { PaginationQueryDto } from '@dto/pagination-query.dto';
import { CURRENCY_CODE_LENGTH } from '@constants/currency.constants';

export class FindExchangeRatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'BRL', description: 'Filtra pelo código da moeda' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsString({ message: i18nValidationMessage<I18nTranslations>('validation.CODE_NOT_STRING') })
  @Length(CURRENCY_CODE_LENGTH, CURRENCY_CODE_LENGTH, {
    message: i18nValidationMessage<I18nTranslations>('validation.CODE_INVALID_LENGTH', {
      length: CURRENCY_CODE_LENGTH,
    }),
  })
  code?: string;
}
