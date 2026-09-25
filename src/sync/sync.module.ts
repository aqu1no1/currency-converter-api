import { Module } from '@nestjs/common';
import { SyncController } from '@/sync/sync.controller';
import { SyncService } from '@/sync/sync.service';

@Module({
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
