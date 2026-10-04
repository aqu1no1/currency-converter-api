import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FindSyncRunsQueryDto } from '@/sync/dto/find-sync-runs-query.dto';
import { SyncRun } from '@/sync/entities/sync-run.entity';
import { SyncService } from '@/sync/sync.service';
import { ApiPaginatedResponse } from '@decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '@dto/paginated-response.dto';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as execuções da sincronização',
    description: 'Retorna as execuções paginadas, da mais recente para a mais antiga.',
  })
  @ApiPaginatedResponse(SyncRun, 'Execuções paginadas')
  @ApiBadRequestResponse({ description: 'Parâmetros de paginação ou filtros inválidos' })
  findAll(@Query() query: FindSyncRunsQueryDto): Promise<PaginatedResponseDto<SyncRun>> {
    return this.syncService.findAll(query);
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
