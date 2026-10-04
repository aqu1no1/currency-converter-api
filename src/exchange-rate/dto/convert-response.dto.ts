import { ApiProperty } from '@nestjs/swagger';

export class ConvertResponseDto {
  @ApiProperty({ example: 'EUR' })
  from: string;

  @ApiProperty({ example: 'BRL' })
  to: string;

  @ApiProperty({ example: 100 })
  amount: number;

  @ApiProperty({ example: 5.891304, description: 'Taxa de from para to, com 6 casas decimais' })
  rate: number;

  @ApiProperty({ example: 589.13, description: 'amount × rate, com 2 casas decimais' })
  result: number;

  @ApiProperty({
    type: 'string',
    format: 'date',
    example: '2026-09-28',
    description: 'Data das cotações usadas no cálculo',
  })
  date: string;
}
