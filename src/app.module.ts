import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { CurrencyModule } from '@/currency/currency.module';
import { ENV_FILE, getDataSourceOptions } from '@/database/data-source';
import { ExchangeRateModule } from '@/exchange-rate/exchange-rate.module';
import { HealthModule } from '@/health/health.module';
import { SyncModule } from '@/sync/sync.module';
import { ExecutionTimeLoggerInterceptor } from '@/common/interceptors/execution-log/execution-time-logger.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ENV_FILE }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...getDataSourceOptions(), autoLoadEntities: true }),
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'pt-BR',
      loaderOptions: { path: join(__dirname, 'i18n'), watch: true },
      typesOutputPath: existsSync(join(process.cwd(), 'src'))
        ? join(process.cwd(), 'src', 'generated', 'i18n.generated.ts')
        : undefined,
      resolvers: [new QueryResolver(['lang']), AcceptLanguageResolver],
    }),
    CurrencyModule,
    ExchangeRateModule,
    HealthModule,
    SyncModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ExecutionTimeLoggerInterceptor }],
})
export class AppModule {}
