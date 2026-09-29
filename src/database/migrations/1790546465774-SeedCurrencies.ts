import type { MigrationInterface, QueryRunner } from 'typeorm';

const typeOfCoins = [
  { id: '01a0e4e3-5b7e-763a-b9ec-ae38b49d5187', name: 'Dólar americano', code: 'USD' },
  { id: '01a0e4e3-5b7e-763a-b9ec-b2cbf89fce2a', name: 'Real brasileiro', code: 'BRL' },
  { id: '01a0e4e3-5b7e-763a-b9ec-b47afc60f7f4', name: 'Euro', code: 'EUR' },
  { id: '01a0e4e3-5b7e-763a-b9ec-b93013111d8c', name: 'Libra esterlina', code: 'GBP' },
  { id: '01a0e4e3-5b7e-763a-b9ec-bdc4d2a9de54', name: 'Iene japonês', code: 'JPY' },
  { id: '01a0e4e3-5b7e-763a-b9ec-c22b0e0ed4f4', name: 'Dólar canadense', code: 'CAD' },
  { id: '01a0e4e3-5b7e-763a-b9ec-c6e30838945d', name: 'Dólar australiano', code: 'AUD' },
  { id: '01a0e4e3-5b7e-763a-b9ec-c887bc5f340a', name: 'Franco suíço', code: 'CHF' },
  { id: '01a0e4e3-5b7e-763a-b9ec-cc6bcc99133b', name: 'Yuan chinês', code: 'CNY' },
  { id: '01a0e4e3-5b7e-763a-b9ec-d15cafb0617a', name: 'Peso argentino', code: 'ARS' },
];

export class SeedCurrencies1790546465774 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.insert('currencies', typeOfCoins);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.delete(
      'currencies',
      typeOfCoins.map((coin) => coin.id),
    );
  }
}
