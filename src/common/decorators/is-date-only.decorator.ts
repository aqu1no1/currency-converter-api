import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import type { I18nTranslations } from '@/generated/i18n.generated';
import { DATE_ONLY_PATTERN } from '@constants/regex.constants';

export function IsDateOnly() {
  return applyDecorators(
    Matches(DATE_ONLY_PATTERN, {
      message: i18nValidationMessage<I18nTranslations>('validation.DATE_FORMAT'),
    }),
    IsISO8601(
      { strict: true },
      { message: i18nValidationMessage<I18nTranslations>('validation.INVALID_DATE') },
    ),
  );
}
