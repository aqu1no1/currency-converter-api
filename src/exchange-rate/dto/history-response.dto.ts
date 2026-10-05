import { ApiProperty } from '@nestjs/swagger';

export class HistoryItemDto {
  @ApiProperty({ type: 'string', format: 'date', example: '2026-09-01' })
  date: string;

  @ApiProperty({ example: 5.38, description: 'Taxa de from para to no dia, com 6 casas decimais' })
  rate: number;
}

export class HistoryResponseDto {
  @ApiProperty({ example: 'USD' })
  from: string;

  @ApiProperty({ example: 'BRL' })
  to: string;

  @ApiProperty({
    type: () => [HistoryItemDto],
    description:
      'Um item por dia em que as duas moedas têm cotação, da data mais antiga para a mais recente',
  })
  history: HistoryItemDto[];
}
