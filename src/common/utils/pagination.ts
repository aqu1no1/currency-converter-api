import type { PaginatedResponseDto } from '@dto/paginated-response.dto';

export function toSkipTake({ page, perPage }: { page: number; perPage: number }): {
  skip: number;
  take: number;
} {
  return { skip: (page - 1) * perPage, take: perPage };
}

export function toPaginatedResponse<T>({
  data,
  total,
  page,
  perPage,
}: {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}): PaginatedResponseDto<T> {
  return { data, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}
