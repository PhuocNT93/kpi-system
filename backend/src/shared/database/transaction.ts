export interface TransactionClient {
  query(queryText: string): Promise<unknown>;
  release(): void;
}

export interface TransactionConnection {
  connect(): Promise<TransactionClient>;
}

export async function withTransaction<T>(
  connection: TransactionConnection,
  work: (client: TransactionClient) => Promise<T>
): Promise<T> {
  const client = await connection.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The original operation error is more actionable than a rollback failure.
    }
    throw error;
  } finally {
    client.release();
  }
}