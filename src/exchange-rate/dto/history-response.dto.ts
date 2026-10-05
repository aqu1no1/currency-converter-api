import { ApiProperty } from '@nestjs/swagger';
import { HistoryItemDto } from '@/exchange-rate/dto/history-item.dto';

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
