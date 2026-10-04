import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  data: T[];

  @ApiProperty({ example: 88000, description: 'Total de itens com os filtros aplicados' })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  perPage: number;

  @ApiProperty({ example: 4400 })
  totalPages: number;
}
