import { ApiProperty } from '@nestjs/swagger';
import { SyncRunStatusDto } from '@/sync/dto/sync-run-status.dto';

export class SyncStatusResponseDto {
  @ApiProperty({
    type: () => SyncRunStatusDto,
    nullable: true,
    description: 'Última execução diária, ou null se o cron ainda não rodou',
  })
  lastRun: SyncRunStatusDto | null;

  @ApiProperty({
    type: 'string',
    format: 'date',
    nullable: true,
    example: '2026-09-28',
    description: 'Data da cotação mais recente salva, ou null se ainda não há cotações',
  })
  latestRateDate: string | null;
}
