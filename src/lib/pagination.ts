/** The home grid is 3 columns × 3 rows: nine tools per page. */
export const GRID_COLUMNS = 3;
export const GRID_PAGE_SIZE = GRID_COLUMNS * 3;

export function pageCountFor(total: number, pageSize = GRID_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Slice one page out of a list. `page` is zero-based and clamped into range. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize = GRID_PAGE_SIZE,
): { items: T[]; page: number; pageCount: number } {
  const pageCount = pageCountFor(items.length, pageSize);
  const current = Math.min(Math.max(0, page), pageCount - 1);
  const start = current * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, pageCount };
}
