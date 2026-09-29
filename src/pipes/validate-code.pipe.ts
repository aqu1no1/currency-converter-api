import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import type { I18nTranslations } from '@/generated/i18n.generated';

const CODE_LENGTH = 3;

@Injectable()
export class ParseCodePipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    const i18n = I18nContext.current<I18nTranslations>();

    if (typeof value !== 'string') {
      throw new BadRequestException(
        i18n?.t('validation.CODE_NOT_STRING') ?? 'The code must be a string',
      );
    }

    if (value.length !== CODE_LENGTH) {
      throw new BadRequestException(
        i18n?.t('validation.CODE_INVALID_LENGTH', { args: { length: CODE_LENGTH } }) ??
          `The code must be exactly ${CODE_LENGTH} characters long`,
      );
    }

    return value.toUpperCase();
  }
}
