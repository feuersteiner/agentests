// Cursor pagination for the list endpoints.

export interface Page<T> {
  items: T[];
  /** The cursor of the next page, or null on the last page. */
  nextCursor: string | null;
  /** Whether more items follow this page. */
  hasMore: boolean;
}

export const PAGE_SIZE = 50;

export function paginate<T extends { id: string }>(items: T[], cursor: string | null): Page<T> {
  const start = cursor === null ? 0 : items.findIndex((item) => item.id === cursor) + 1;
  const pageItems = items.slice(start, start + PAGE_SIZE);
  const hasMore = start + PAGE_SIZE < items.length;
  return {
    items: pageItems,
    nextCursor: hasMore ? pageItems[pageItems.length - 1].id : null,
    hasMore,
  };
}
