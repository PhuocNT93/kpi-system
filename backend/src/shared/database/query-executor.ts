export interface QueryResultLike<R> {
  rows: R[];
  rowCount?: number | null;
}

/** Anything that can run a parameterised query: a Pool, a PoolClient, or a transaction client. */
export interface QueryExecutor {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    queryText: string,
    values?: unknown[]
  ): Promise<QueryResultLike<R>>;
}

/** Minimal non-generic query surface of a transaction client. */
export interface UntypedQueryRunner {
  query(queryText: string, values?: unknown[]): Promise<QueryResultLike<Record<string, unknown>>>;
}

/**
 * Adapts a transaction client (whose rows are untyped) to QueryExecutor so repositories typed with
 * QueryExecutor can join the caller's transaction. Row typing stays the repository's responsibility.
 */
export function toQueryExecutor(client: UntypedQueryRunner): QueryExecutor {
  return {
    query: async <R extends Record<string, unknown> = Record<string, unknown>>(
      queryText: string,
      values?: unknown[]
    ): Promise<QueryResultLike<R>> => (await client.query(queryText, values)) as QueryResultLike<R>,
  };
}
