import type { INestApplication } from '@nestjs/common';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new I18nValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new I18nValidationExceptionFilter({ detailedErrors: false }));
}
