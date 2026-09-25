import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncRun } from '@/sync/entities/sync-runs.entity';
import { SyncType } from '@/sync/enums/sync-type.enum';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncRun)
    private readonly syncRunRepository: Repository<SyncRun>,
  ) {}

  findAll(): Promise<SyncRun[]> {
    return this.syncRunRepository.find({ order: { startedAt: 'DESC' } });
  }

  async syncRates(type: SyncType): Promise<void> {
    this.logger.verbose(`Syncing rates (${type})`);

    // TODO: criar o sync_run com status RUNNING e started_at
    // TODO: buscar as cotacoes na API externa (base USD)
    // TODO: inserir em exchange_rates as moedas conhecidas, ignorando (currency_id, rate_date) repetido
    // TODO: marcar SUCCESS com rows_inserted, ou FAILED com error_message, e preencher finished_at
  }
}
