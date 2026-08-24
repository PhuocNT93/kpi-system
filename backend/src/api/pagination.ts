/**
 * Pagination helpers — query parsing and PageMeta construction.
 *
 * Conventions (BACKEND_NODE_RULES §4):
 *  - All collection endpoints are paginated.
 *  - Query params: `page` (1-based, default 1) and `page_size` (default 20, max 100).
 *  - Response meta includes `page.number`, `page.size`, `page.total_items`, `page.total_pages`.
 *
 * Usage:
 *   const { offset, limit, buildPageMeta } = parsePaginationQuery(req.query);
 *   const [items, totalItems] = await repo.findAndCount({ offset, limit });
 *   sendCollection(res, 'Items retrieved successfully.', items, buildPageMeta(totalItems));
 */

import type { PageMeta } from './http-response.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  /** 0-based offset for the repository query */
  offset: number;
  /** Row count to fetch */
  limit: number;
  /** Builds the PageMeta for sendCollection given the total item count */
  buildPageMeta: (totalItems: number) => PageMeta;
}

/**
 * Parse `page` and `page_size` from an Express request's query object.
 * Invalid or out-of-range values silently fall back to defaults.
 */
export function parsePaginationQuery(query: Record<string, unknown>): PaginationParams {
  const pageNumber = clampInt(query['page'], DEFAULT_PAGE, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInt(query['page_size'], DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);

  const offset = (pageNumber - 1) * pageSize;
  const limit = pageSize;

  function buildPageMeta(totalItems: number): PageMeta {
    return {
      number: pageNumber,
      size: pageSize,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / pageSize)
    };
  }

  return { offset, limit, buildPageMeta };
}

// ── Internal utility ──────────────────────────────────────────────────────────

function clampInt(
  raw: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}
