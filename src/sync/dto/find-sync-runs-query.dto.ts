import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import type { I18nTranslations } from '@/generated/i18n.generated';
import { SyncStatus } from '@/sync/enums/sync-status.enum';
import { SyncType } from '@/sync/enums/sync-type.enum';
import { PaginationQueryDto } from '@dto/pagination-query.dto';

export class FindSyncRunsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SyncType })
  @IsOptional()
  @IsIn(Object.values(SyncType), {
    message: i18nValidationMessage<I18nTranslations>('validation.INVALID_OPTION'),
  })
  type?: SyncType;

  @ApiPropertyOptional({ enum: SyncStatus })
  @IsOptional()
  @IsIn(Object.values(SyncStatus), {
    message: i18nValidationMessage<I18nTranslations>('validation.INVALID_OPTION'),
  })
  status?: SyncStatus;
}
