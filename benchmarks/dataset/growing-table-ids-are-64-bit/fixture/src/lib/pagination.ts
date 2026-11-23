const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(query: { page?: string; limit?: string }) {
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const limit = Number.parseInt(query.limit ?? "", 10) || DEFAULT_LIMIT;
  return { skip: (page - 1) * limit, take: limit };
}
