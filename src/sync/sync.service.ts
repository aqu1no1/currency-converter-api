import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  findAll(): string[] {
    this.logger.debug('Listando sincronizações');
    return [];
  }
}
