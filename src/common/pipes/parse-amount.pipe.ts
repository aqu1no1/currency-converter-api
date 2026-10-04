import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import Decimal from 'decimal.js';
import { I18nContext } from 'nestjs-i18n';
import type { I18nTranslations } from '@/generated/i18n.generated';
import { AMOUNT_PATTERN } from '@constants/regex.constants';

@Injectable()
export class ParseAmountPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    const i18n = I18nContext.current<I18nTranslations>();

    if (typeof value !== 'string' || !AMOUNT_PATTERN.test(value)) {
      throw new BadRequestException(
        i18n?.t('validation.AMOUNT_INVALID') ?? 'The amount must be a number',
      );
    }

    if (new Decimal(value).lessThan(0)) {
      throw new BadRequestException(
        i18n?.t('errors.NEGATIVE', { args: { entity: i18n.t('t.AMOUNT') } }) ??
          'Amount cannot be negative',
      );
    }

    return value;
  }
}
