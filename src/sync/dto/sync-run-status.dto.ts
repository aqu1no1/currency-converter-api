import { ApiProperty } from '@nestjs/swagger';
import { SyncStatus } from '@/sync/enums/sync-status.enum';
import { SyncType } from '@/sync/enums/sync-type.enum';

export class SyncRunStatusDto {
  @ApiProperty({ enum: SyncType, example: SyncType.DAILY })
  type: SyncType;

  @ApiProperty({ enum: SyncStatus, example: SyncStatus.SUCCESS })
  status: SyncStatus;

  @ApiProperty({ type: 'string', format: 'date-time', example: '2026-09-29T09:00:00Z' })
  startedAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    example: '2026-09-29T09:00:02Z',
  })
  finishedAt: Date | null;

  @ApiProperty({ example: 45 })
  rowsInserted: number;

  @ApiProperty({ type: 'string', nullable: true, example: null })
  error: string | null;
}
