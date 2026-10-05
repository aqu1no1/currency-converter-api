import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { CurrencyModule } from '@/currency/currency.module';
import { configs, databaseConfig, ENV_FILE, validateEnv } from '@/config';
import { getDataSourceOptions } from '@/database/data-source-options';
import { ExchangeRateModule } from '@/exchange-rate/exchange-rate.module';
import { HealthModule } from '@/health/health.module';
import { SyncModule } from '@/sync/sync.module';
import { ExecutionTimeLoggerInterceptor } from '@/common/interceptors/execution-log/execution-time-logger.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ENV_FILE,
      validate: validateEnv,
      load: configs,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (database: ConfigType<typeof databaseConfig>) => ({
        ...getDataSourceOptions(database),
        autoLoadEntities: true,
      }),
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
