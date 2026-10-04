import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { AppModule } from '@/app.module';
import { createLogger } from '@/common/utils/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: createLogger() });
  app.useGlobalPipes(
    new I18nValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new I18nValidationExceptionFilter({ detailedErrors: false }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Currency Converter API')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
