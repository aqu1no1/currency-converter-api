import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { CurrencyModule } from '@/currency/currency.module';
import { getDataSourceOptions } from '@/database/data-source';
import { HealthModule } from '@/health/health.module';
import { ExecutionTimeLoggerInterceptor } from '@interceptors/execution-log/execution-time-logger.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: getDataSourceOptions }),
    I18nModule.forRoot({
      fallbackLanguage: 'pt-BR',
      loaderOptions: { path: join(__dirname, 'i18n'), watch: true },
      // ?lang=en tem prioridade sobre o header Accept-Language
      resolvers: [new QueryResolver(['lang']), AcceptLanguageResolver],
    }),
    CurrencyModule,
    HealthModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ExecutionTimeLoggerInterceptor }],
})
export class AppModule {}
