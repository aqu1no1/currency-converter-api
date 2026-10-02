import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SyncRun } from '@/sync/entities/sync-run.entity';
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

  @Post('backfill')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Executa a carga inicial',
    description:
      'Inicia a busca das cotações de 2000 até hoje, um ano por chamada. Responde na hora; acompanhe o andamento em GET /sync.',
  })
  @ApiAcceptedResponse({ type: SyncRun, description: 'Execução iniciada, com status RUNNING' })
  @ApiConflictResponse({ description: 'Já existe uma carga inicial em execução' })
  backfill(): Promise<SyncRun> {
    return this.syncService.startBackfill();
  }
}
