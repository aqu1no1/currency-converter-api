import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import type { I18nTranslations } from '@/generated/i18n.generated';
import { LocalizedQueryDto } from '@dto/localized-query.dto';
import { PAGINATION } from '@constants/pagination.constants';

export class PaginationQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional({ default: PAGINATION.DEFAULT_PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage<I18nTranslations>('validation.MUST_BE_INTEGER') })
  @Min(1, { message: i18nValidationMessage<I18nTranslations>('validation.MIN') })
  page: number = PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: PAGINATION.DEFAULT_PER_PAGE,
    minimum: 1,
    maximum: PAGINATION.MAX_PER_PAGE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage<I18nTranslations>('validation.MUST_BE_INTEGER') })
  @Min(1, { message: i18nValidationMessage<I18nTranslations>('validation.MIN') })
  @Max(PAGINATION.MAX_PER_PAGE, {
    message: i18nValidationMessage<I18nTranslations>('validation.MAX'),
  })
  perPage: number = PAGINATION.DEFAULT_PER_PAGE;
}
