import { ApiProperty } from '@nestjs/swagger';

export class HistoryItemDto {
  @ApiProperty({ type: 'string', format: 'date', example: '2026-09-01' })
  date: string;

  @ApiProperty({ example: 5.38, description: 'Taxa de from para to no dia, com 6 casas decimais' })
  rate: number;
}
