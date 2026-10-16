import type { INestApplication } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { appConfig } from '@/config';

export function configureApp(app: INestApplication): void {
  const { corsOrigins } = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Accept-Language'],
  });

  app.useGlobalPipes(
    new I18nValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new I18nValidationExceptionFilter({ detailedErrors: false }));
}
