import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryColumn, type Relation } from 'typeorm';
import { ExchangeRate } from '@/currency/entities/exchange-rate.entity';
import { SyncStatus } from '@/sync/enums/sync-status.enum';
import { SyncType } from '@/sync/enums/sync-type.enum';

@Entity('sync_runs')
export class SyncRun {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn({ type: 'uuid', default: () => 'uuidv7()' })
  id: string;

  @ApiProperty({ enum: SyncType })
  @Column({ type: 'varchar', length: 20 })
  type: SyncType;

  @ApiProperty({ enum: SyncStatus })
  @Column({ type: 'varchar', length: 20 })
  status: SyncStatus;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Column({ type: 'timestamptz', name: 'started_at' })
  startedAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  @Column({ type: 'timestamptz', name: 'finished_at', nullable: true })
  finishedAt?: Date | null;

  @ApiProperty()
  @Column({ type: 'int', name: 'rows_inserted', default: 0 })
  rowsInserted: number;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage?: string | null;

  @OneToMany(() => ExchangeRate, (exchangeRate) => exchangeRate.syncRun)
  exchangeRates: Relation<ExchangeRate[]>;
}
