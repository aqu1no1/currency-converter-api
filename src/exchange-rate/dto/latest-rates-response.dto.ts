import { ApiProperty } from '@nestjs/swagger';

export class LatestRatesResponseDto {
  @ApiProperty({ example: 'EUR' })
  base: string;

  @ApiProperty({
    type: 'string',
    format: 'date',
    example: '2026-09-28',
    description: 'Data das cotações usadas no cálculo',
  })
  date: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { USD: 1.14, BRL: 5.92, JPY: 179.53 },
    description: 'Quanto vale 1 unidade da base em cada moeda, com 6 casas decimais',
  })
  rates: Record<string, number>;
}
