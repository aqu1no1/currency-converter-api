import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { ExchangeRate } from '@/currency/entities/exchange-rate.entity';

@Entity('currencies')
export class Currency {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn({ type: 'uuid', default: () => 'uuidv7()' })
  id: string;

  @ApiProperty({ example: 'USD' })
  @Column({ type: 'varchar', length: 3, unique: true })
  code: string;

  @ApiProperty({ example: 'Dolar americano' })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ExchangeRate, (exchangeRate) => exchangeRate.currency)
  exchangeRates: Relation<ExchangeRate[]>;
}
