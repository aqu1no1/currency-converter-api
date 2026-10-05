import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '@/app.module';
import { configureApp } from '@/configure-app';
import { ExchangeRateProvider } from '@ports/exchange-rate-provider.port';
import { FakeExchangeRateProvider } from './fake-exchange-rate-provider';

export interface CreateTestingAppOptions {
  configureBuilder?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

export interface TestingApp {
  app: INestApplication;
  http: ReturnType<typeof request>;
  dataSource: DataSource;
  provider: FakeExchangeRateProvider;
  close: () => Promise<void>;
}

export async function createTestingApp({
  configureBuilder = (builder) => builder,
}: CreateTestingAppOptions = {}): Promise<TestingApp> {
  const provider = new FakeExchangeRateProvider();

  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ExchangeRateProvider)
    .useValue(provider);

  const moduleRef = await configureBuilder(builder).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();

  return {
    app,
    http: request(app.getHttpServer()),
    dataSource: app.get(DataSource),
    provider,
    close: () => app.close(),
  };
}
