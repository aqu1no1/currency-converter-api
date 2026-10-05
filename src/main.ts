import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';
import { createLogger } from '@/common/utils/logger';
import { configureApp } from '@/configure-app';
import { appConfig } from '@/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: createLogger() });
  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Currency Converter API')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, swaggerConfig));

  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  await app.listen(config.port);
}
void bootstrap();
