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
