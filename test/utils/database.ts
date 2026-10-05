import type { DataSource } from 'typeorm';

export async function resetDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.query('TRUNCATE TABLE exchange_rates, sync_runs');
}
