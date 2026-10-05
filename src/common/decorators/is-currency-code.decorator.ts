import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import type { I18nTranslations } from '@/generated/i18n.generated';
import { CURRENCY_CODE_LENGTH } from '@constants/currency.constants';

export function IsCurrencyCode() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.toUpperCase() : value,
    ),
    IsString({ message: i18nValidationMessage<I18nTranslations>('validation.CODE_NOT_STRING') }),
    Length(CURRENCY_CODE_LENGTH, CURRENCY_CODE_LENGTH, {
      message: i18nValidationMessage<I18nTranslations>('validation.CODE_INVALID_LENGTH', {
        length: CURRENCY_CODE_LENGTH,
      }),
    }),
  );
}
