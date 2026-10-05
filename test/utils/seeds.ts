import type { DataSource } from 'typeorm';
import { Currency } from '@/currency/entities/currency.entity';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { SyncRun } from '@/sync/entities/sync-run.entity';
import { SyncStatus } from '@/sync/enums/sync-status.enum';
import { SyncType } from '@/sync/enums/sync-type.enum';

export async function seedRates(
  dataSource: DataSource,
  {
    date,
    rates,
    syncRunId = null,
  }: { date: string; rates: Record<string, string>; syncRunId?: string | null },
): Promise<ExchangeRate[]> {
  const currencies = await dataSource.getRepository(Currency).find();
  const currencyIdByCode = new Map(currencies.map((currency) => [currency.code, currency.id]));

  const rows = Object.entries(rates).map(([code, rate]) => {
    const currencyId = currencyIdByCode.get(code);

    if (!currencyId) throw new Error(`Unknown currency in seed: ${code}`);

    return { currencyId, syncRunId, rate, rateDate: date };
  });

  return dataSource.getRepository(ExchangeRate).save(rows);
}

export function seedSyncRun(
  dataSource: DataSource,
  overrides: Partial<SyncRun> = {},
): Promise<SyncRun> {
  return dataSource.getRepository(SyncRun).save({
    type: SyncType.DAILY,
    status: SyncStatus.SUCCESS,
    startedAt: new Date(),
    finishedAt: new Date(),
    rowsInserted: 0,
    ...overrides,
  });
}
