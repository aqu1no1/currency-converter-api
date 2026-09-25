import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { Currency } from '@/currency/entities/currency.entity';
import { SyncRun } from '@/sync/entities/sync-runs.entity';

@Entity('exchange_rates')
@Unique(['currencyId', 'rateDate'])
export class ExchangeRate {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn({ type: 'uuid', default: () => 'uuidv7()' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid', name: 'currency_id' })
  currencyId: string;

  @ApiPropertyOptional({ type: 'string', format: 'uuid', nullable: true })
  @Column({ type: 'uuid', name: 'sync_run_id', nullable: true })
  syncRunId?: string | null;

  // numeric chega como string pelo driver pg para nao perder precisao
  @ApiProperty({ type: 'string', example: '5.4321' })
  @Column({ type: 'numeric' })
  rate: string;

  @ApiProperty({ type: 'string', format: 'date', example: '2026-09-25' })
  @Column({ type: 'date', name: 'rate_date' })
  rateDate: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Currency, (currency) => currency.exchangeRates)
  @JoinColumn({ name: 'currency_id' })
  currency: Relation<Currency>;

  @ManyToOne(() => SyncRun, (syncRun) => syncRun.exchangeRates, { nullable: true })
  @JoinColumn({ name: 'sync_run_id' })
  syncRun?: Relation<SyncRun> | null;
}
