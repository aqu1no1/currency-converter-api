import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SyncRun } from '@/sync/entities/sync-runs.entity';
import { SyncService } from '@/sync/sync.service';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get()
  @ApiOkResponse({ type: [SyncRun] })
  findAll(): Promise<SyncRun[]> {
    return this.syncService.findAll();
  }
}
