import { type MigrationInterface, type QueryRunner, Table } from 'typeorm';

export class ExchangeRatesTable1790470193211 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'exchange_rates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuidv7()',
          },
          {
            name: 'currency_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'sync_run_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'rate',
            type: 'numeric',
            isNullable: false,
          },
          {
            name: 'rate_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
        ],
        uniques: [
          {
            columnNames: ['currency_id', 'rate_date'],
          },
        ],
        foreignKeys: [
          {
            name: 'FK_exchange_rates_currency_id',
            columnNames: ['currency_id'],
            referencedTableName: 'currencies',
            referencedColumnNames: ['id'],
          },
          {
            name: 'FK_exchange_rates_sync_run_id',
            columnNames: ['sync_run_id'],
            referencedTableName: 'sync_runs',
            referencedColumnNames: ['id'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('exchange_rates', 'FK_exchange_rates_sync_run_id');
    await queryRunner.dropForeignKey('exchange_rates', 'FK_exchange_rates_currency_id');
    await queryRunner.dropTable('exchange_rates');
  }
}
