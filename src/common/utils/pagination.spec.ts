import { toPaginatedResponse, toSkipTake } from '@utils/pagination';

describe('toSkipTake', () => {
  it('starts at zero on the first page', () => {
    expect(toSkipTake({ page: 1, perPage: 20 })).toEqual({ skip: 0, take: 20 });
  });

  it('skips the previous pages', () => {
    expect(toSkipTake({ page: 3, perPage: 20 })).toEqual({ skip: 40, take: 20 });
  });
});

describe('toPaginatedResponse', () => {
  it('rounds totalPages up', () => {
    expect(toPaginatedResponse({ data: [1, 2], total: 41, page: 3, perPage: 20 })).toEqual({
      data: [1, 2],
      total: 41,
      page: 3,
      perPage: 20,
      totalPages: 3,
    });
  });

  it('returns zero pages when there are no items', () => {
    expect(toPaginatedResponse({ data: [], total: 0, page: 1, perPage: 20 }).totalPages).toBe(0);
  });
});
